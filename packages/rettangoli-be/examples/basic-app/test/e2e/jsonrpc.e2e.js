import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { createHttpHandler } from '@rettangoli/be';

const parseJsonSafe = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const withGeneratedServer = async (run) => {
  process.env.OTP_SECRET = process.env.OTP_SECRET || 'e2e-secret';
  const { app } = await import('../../.rtgl-be/generated/app.js');
  const rpcHandler = createHttpHandler({ app });

  const server = createServer((request, response) => {
    rpcHandler(request, response).catch((error) => {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: {
            reason: 'unhandled_http_handler_error',
            detail: error.message,
          },
        },
      }));
    });
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run({ baseUrl });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
};

const callRpc = async ({ baseUrl, body, cookie, method = 'POST' }) => {
  const headers = {};

  if (method === 'POST') {
    headers['content-type'] = 'application/json';
  }

  if (cookie) {
    headers.cookie = cookie;
  }

  const response = await fetch(`${baseUrl}/rpc`, {
    method,
    headers,
    body,
  });

  const text = await response.text();

  return {
    status: response.status,
    text,
    json: parseJsonSafe(text),
    setCookie: response.headers.get('set-cookie') || '',
  };
};

test('e2e: health.ping success', async () => {
  await withGeneratedServer(async ({ baseUrl }) => {
    const result = await callRpc({
      baseUrl,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'e2e-1',
        method: 'health.ping',
        params: {
          echo: 'hello',
        },
      }),
    });

    assert.equal(result.status, 200);
    assert.equal(result.json.jsonrpc, '2.0');
    assert.equal(result.json.id, 'e2e-1');
    assert.equal(result.json.result.ok, true);
    assert.equal(result.json.result.echo, 'hello');
    assert.equal(typeof result.json.result.requestId, 'string');
    assert.equal(typeof result.json.result.ts, 'number');
  });
});

test('e2e: health.ping invalid params -> -32602', async () => {
  await withGeneratedServer(async ({ baseUrl }) => {
    const result = await callRpc({
      baseUrl,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'e2e-2',
        method: 'health.ping',
        params: {
          echo: 123,
        },
      }),
    });

    assert.equal(result.status, 200);
    assert.equal(result.json.error.code, -32602);
    assert.equal(result.json.error.message, 'Invalid params');
  });
});

test('e2e: user.getProfile without cookie -> domain error envelope', async () => {
  await withGeneratedServer(async ({ baseUrl }) => {
    const result = await callRpc({
      baseUrl,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'e2e-3',
        method: 'user.getProfile',
        params: {},
      }),
    });

    assert.equal(result.status, 200);
    assert.equal(result.json.error.code, -32000);
    assert.equal(result.json.error.message, 'AUTH_REQUIRED');
    assert.equal(result.json.error.data.type, 'AUTH_REQUIRED');
    assert.deepEqual(result.json.error.data.details, { reason: 'auth_required' });
  });
});

test('e2e: user.getProfile with cookie -> success + Set-Cookie', async () => {
  await withGeneratedServer(async ({ baseUrl }) => {
    const result = await callRpc({
      baseUrl,
      cookie: 'session=token-123',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'e2e-4',
        method: 'user.getProfile',
        params: {},
      }),
    });

    assert.equal(result.status, 200);
    assert.deepEqual(result.json.result, {
      id: 'u-1',
      email: 'demo@example.com',
      role: 'user',
    });

    assert.match(result.setCookie, /session=token-123/);
    assert.match(result.setCookie, /HttpOnly/i);
  });
});

test('e2e: unknown method -> -32601', async () => {
  await withGeneratedServer(async ({ baseUrl }) => {
    const result = await callRpc({
      baseUrl,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'e2e-5',
        method: 'unknown.method',
        params: {},
      }),
    });

    assert.equal(result.status, 200);
    assert.equal(result.json.error.code, -32601);
    assert.equal(result.json.error.message, 'Method not found');
  });
});

test('e2e: invalid JSON body -> -32700', async () => {
  await withGeneratedServer(async ({ baseUrl }) => {
    const result = await callRpc({
      baseUrl,
      body: '{not-json',
    });

    assert.equal(result.status, 200);
    assert.equal(result.json.error.code, -32700);
    assert.equal(result.json.error.message, 'Parse error');
  });
});

test('e2e: GET request -> 405 + -32600', async () => {
  await withGeneratedServer(async ({ baseUrl }) => {
    const result = await callRpc({
      baseUrl,
      method: 'GET',
    });

    assert.equal(result.status, 405);
    assert.equal(result.json.error.code, -32600);
    assert.equal(result.json.error.message, 'Invalid Request');
  });
});
