import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAllSources, API_SOURCES } from '../fetcher.js';

test('times out a stalled response body and keeps successful provider rates', async () => {
  const [stalledSource, ...successfulSources] = Object.values(API_SOURCES);
  const timeoutMs = 30;
  const successfulData = {
    rates: { EUR: 0.9, GBP: 0.8 },
    time_last_update_unix: 1_700_000_000,
    date: '2023-11-14'
  };

  const fetchImpl = async (url, { signal }) => {
    if (url !== stalledSource.url) {
      return new Response(JSON.stringify(successfulData), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }

    const body = new ReadableStream({
      start(controller) {
        signal.addEventListener('abort', () => {
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          controller.error(error);
        }, { once: true });
      }
    });
    return new Response(body, { status: 200 });
  };

  let boundedResult;
  let upperBoundTimer;
  try {
    boundedResult = await Promise.race([
      fetchAllSources({ timeoutMs, fetchImpl }),
      new Promise((_, reject) => {
        upperBoundTimer = setTimeout(() => reject(new Error('test exceeded upper bound')), 300);
      })
    ]);
  } finally {
    clearTimeout(upperBoundTimer);
  }

  assert.equal(successfulSources.length, 2);
  assert.equal(boundedResult.length, 2);
  assert.deepEqual(boundedResult.map(result => result.source).sort(),
    successfulSources.map(source => source.name).sort());
  for (const result of boundedResult) {
    assert.deepEqual(result.rates, { EUR: 0.9, GBP: 0.8 });
  }
});
