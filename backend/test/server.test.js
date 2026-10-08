import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../server.js';

test('GET /api/currencies serves the supported currency list', async () => {
  const server = createApp().listen(0, '127.0.0.1');

  try {
    await once(server, 'listening');
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/currencies`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      base: 'USD',
      targets: ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'MXN', 'BRL']
    });
  } finally {
    server.close();
    await once(server, 'close');
  }
});
