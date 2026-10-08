import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { afterEach, test } from 'node:test';
import * as cache from '../cache.js';
import { API_SOURCES } from '../fetcher.js';
import { createApp } from '../server.js';

const originalFetch = globalThis.fetch;
const servers = new Set();

afterEach(async () => {
  globalThis.fetch = originalFetch;
  cache.clear();
  await Promise.all([...servers].map(closeServer));
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function startApp() {
  const server = createApp().listen(0, '127.0.0.1');
  servers.add(server);
  return once(server, 'listening').then(() => ({
    server,
    url: `http://127.0.0.1:${server.address().port}`
  }));
}

function closeServer(server) {
  if (!servers.delete(server) || !server.listening) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
}

function requestJson(url, path) {
  return new Promise((resolve, reject) => {
    const request = http.get(new URL(path, url), response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(body) }));
    });
    request.on('error', reject);
  });
}

async function bounded(promise, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} exceeded 1000ms`)), 1000);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function assertPending(promise, label) {
  let settled = false;
  promise.then(() => { settled = true; }, () => { settled = true; });
  await bounded(new Promise(resolve => setTimeout(resolve, 25)), `${label} pending check`);
  assert.equal(settled, false, `${label} should await the shared refresh`);
}

function providerSuccess() {
  return {
    ok: true,
    status: 200,
    async json() {
      return {
        rates: { EUR: 1.1, GBP: 0.8 },
        time_last_update_unix: Math.floor(Date.now() / 1000),
        date: new Date().toISOString().slice(0, 10)
      };
    }
  };
}

function controlledProviderFetch({ fail = false } = {}) {
  const gate = deferred();
  const allCalls = deferred();
  const count = { value: 0 };
  const fetchImpl = async () => {
    count.value += 1;
    if (count.value === Object.keys(API_SOURCES).length) allCalls.resolve();
    await gate.promise;
    if (fail) throw new Error('controlled provider failure');
    return providerSuccess();
  };
  return {
    count,
    fetchImpl,
    waitForAllCalls: () => bounded(allCalls.promise, 'provider calls'),
    succeed: () => gate.resolve(),
    fail: () => gate.reject(new Error('controlled provider failure'))
  };
}

test('GET /api/currencies serves the supported currency list', async () => {
  const { server, url } = await startApp();

  try {
    const response = await bounded(requestJson(url, '/api/currencies'), 'currency request');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      base: 'USD',
      targets: ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'MXN', 'BRL']
    });
  } finally {
    await closeServer(server);
  }
});

test('concurrent empty-cache requests await one shared refresh', async () => {
  cache.clear();
  const server = await startApp();
  const provider = controlledProviderFetch();
  globalThis.fetch = provider.fetchImpl;

  try {
    const first = requestJson(server.url, '/api/rates');
    const second = requestJson(server.url, '/api/rates');
    await provider.waitForAllCalls();
    assert.equal(provider.count.value, Object.keys(API_SOURCES).length);
    await assertPending(second, 'second empty-cache request');
    assert.equal((await bounded(requestJson(server.url, '/api/health'), 'health request')).body.cache.isRefreshing, true);

    provider.succeed();
    const responses = await bounded(Promise.all([first, second]), 'concurrent empty-cache requests');
    assert.deepEqual(responses.map(response => response.status), [200, 200]);
    assert.deepEqual(responses.map(response => response.body.status), ['live', 'live']);
    assert.deepEqual(responses[0].body.rates, responses[1].body.rates);
    assert.equal(provider.count.value, Object.keys(API_SOURCES).length);
    assert.equal((await bounded(requestJson(server.url, '/api/health'), 'settled health request')).body.cache.isRefreshing, false);

    cache.set(responses[0].body, Date.now() - 10 * 60 * 1000);
    const subsequentRefresh = await bounded(requestJson(server.url, '/api/rates'), 'post-success refresh');
    assert.equal(subsequentRefresh.body.status, 'live');
    assert.equal(provider.count.value, Object.keys(API_SOURCES).length * 2);
  } finally {
    provider.succeed();
    await closeServer(server.server);
  }
});

test('concurrent stale-cache requests await one refresh and return fresh data', async () => {
  cache.clear();
  cache.set({
    rates: { EUR: 0.9 }, timestamp: Date.now() - 10 * 60 * 1000,
    sources: ['seed'], resolution: 'single-source'
  }, Date.now() - 10 * 60 * 1000);
  assert.equal(cache.get().isStale, true, 'timestamp seam should seed expired cache data');
  const server = await startApp();
  const provider = controlledProviderFetch();
  globalThis.fetch = provider.fetchImpl;

  try {
    const first = requestJson(server.url, '/api/rates');
    const second = requestJson(server.url, '/api/rates');
    await provider.waitForAllCalls();
    assert.equal(provider.count.value, Object.keys(API_SOURCES).length);
    await assertPending(second, 'second stale-cache request');
    provider.succeed();
    const responses = await bounded(Promise.all([first, second]), 'concurrent stale-cache requests');
    assert.deepEqual(responses.map(response => response.status), [200, 200]);
    assert.deepEqual(responses.map(response => response.body.status), ['live', 'live']);
    assert.deepEqual(responses[0].body.rates, responses[1].body.rates);
    assert.equal(provider.count.value, Object.keys(API_SOURCES).length);
  } finally {
    provider.succeed();
    await closeServer(server.server);
  }
});

test('concurrent refresh failure falls back consistently and a later request retries', async () => {
  cache.clear();
  cache.set({
    rates: { EUR: 0.9 }, timestamp: Date.now() - 10 * 60 * 1000,
    sources: ['seed'], resolution: 'single-source'
  }, Date.now() - 10 * 60 * 1000);
  const server = await startApp();
  const failingProvider = controlledProviderFetch({ fail: true });
  globalThis.fetch = failingProvider.fetchImpl;

  try {
    const first = requestJson(server.url, '/api/rates');
    const second = requestJson(server.url, '/api/rates');
    await failingProvider.waitForAllCalls();
    assert.equal(failingProvider.count.value, Object.keys(API_SOURCES).length);
    await assertPending(second, 'second shared-failure request');
    failingProvider.fail();

    const failures = await bounded(Promise.all([first, second]), 'shared failure requests');
    assert.deepEqual(failures.map(response => response.status), [200, 200]);
    assert.deepEqual(failures.map(response => response.body.status), ['stale', 'stale']);
    assert.deepEqual(failures[0].body.rates, failures[1].body.rates);

    let retryCalls = 0;
    globalThis.fetch = async () => {
      retryCalls += 1;
      return providerSuccess();
    };
    const retry = await bounded(requestJson(server.url, '/api/rates'), 'retry request');
    assert.equal(retry.status, 200);
    assert.equal(retry.body.status, 'live');
    assert.equal(retryCalls, Object.keys(API_SOURCES).length);
  } finally {
    failingProvider.fail();
    await closeServer(server.server);
  }
});
