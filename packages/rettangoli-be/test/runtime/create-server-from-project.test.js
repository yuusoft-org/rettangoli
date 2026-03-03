import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { createServerFromProject } from '../../src/runtime/createServerFromProject.js';

const writePingMethodFiles = ({ rootDir }) => {
  const methodDir = path.join(rootDir, 'src', 'modules', 'health', 'ping');
  mkdirSync(methodDir, { recursive: true });

  writeFileSync(path.join(methodDir, 'ping.handlers.js'), [
    'export const healthPingMethod = async () => ({ ok: true });',
    '',
  ].join('\n'));

  writeFileSync(path.join(methodDir, 'ping.rpc.yaml'), [
    'method: health.ping',
    'description: ping',
    'middleware:',
    '  before: []',
    '  after: []',
    'paramsSchema:',
    '  type: object',
    '  additionalProperties: false',
    '  properties: {}',
    '  required: []',
    'resultSchema:',
    '    type: object',
    '    additionalProperties: false',
    '    properties:',
    '      ok:',
    '        type: boolean',
    '    required: [ok]',
    'errorSchema:',
    '    type: object',
    '    additionalProperties: false',
    '    properties:',
    '      _error:',
    '        const: true',
    '      code:',
    '        type: string',
    '    required: [_error, code]',
    '',
  ].join('\n'));

  writeFileSync(path.join(methodDir, 'ping.spec.yaml'), [
    "file: './ping.handlers.js'",
    'group: ping',
    '---',
    'suite: healthPingMethod',
    'exportName: healthPingMethod',
    '---',
    'case: ok',
    'in:',
    '  - payload: {}',
    'out:',
    '  ok: true',
    '',
  ].join('\n'));
};

describe('createServerFromProject', () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it('loads rpcPath from config and serves default built-in health extension', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-server-'));
    createdDirs.push(rootDir);

    const srcDir = path.join(rootDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writePingMethodFiles({ rootDir });

    writeFileSync(path.join(srcDir, 'setup.js'), [
      'export const setup = {',
      '  deps: {',
      '    health: {},',
      '  },',
      '};',
      '',
    ].join('\n'));

    writeFileSync(path.join(rootDir, 'rettangoli.config.yaml'), [
      'be:',
      '  rpcPath: "/rpc-v2"',
      '',
    ].join('\n'));

    const runtime = await createServerFromProject({
      cwd: rootDir,
    });

    await runtime.listen({ host: '127.0.0.1', port: 0 });
    const address = runtime.server.address();
    const port = Number(address.port);

    const rpcResponse = await fetch(`http://127.0.0.1:${port}/rpc-v2`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'health.ping',
        params: {},
      }),
    });
    const rpcPayload = await rpcResponse.json();
    expect(rpcPayload.result.ok).toBe(true);

    const healthResponse = await fetch(`http://127.0.0.1:${port}/healthz`);
    const healthPayload = await healthResponse.json();
    expect(healthPayload).toEqual({ status: 'ok' });

    await runtime.close();
  });

  it('runs custom extension handlers from setup.extensions', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-server-custom-ext-'));
    createdDirs.push(rootDir);

    const srcDir = path.join(rootDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writePingMethodFiles({ rootDir });

    writeFileSync(path.join(srcDir, 'setup.js'), [
      'export const setup = {',
      '  deps: {',
      '    health: {},',
      '    custom: {',
      '      value: "x1",',
      '    },',
      '  },',
      '  extensions: [',
      '    {',
      '      name: "custom-http",',
      '      type: "http",',
      '      path: "/custom",',
      '      methods: ["GET", "PUT"],',
      '      onRequest: async ({ req, deps }) => ({',
      '        status: 200,',
      '        body: {',
      '          ok: true,',
      '          method: req.method,',
      '          value: deps.custom.value,',
      '        },',
      '      }),',
      '    },',
      '  ],',
      '};',
      '',
    ].join('\n'));

    const runtime = await createServerFromProject({
      cwd: rootDir,
    });

    await runtime.listen({ host: '127.0.0.1', port: 0 });
    const address = runtime.server.address();
    const port = Number(address.port);

    const customGetResponse = await fetch(`http://127.0.0.1:${port}/custom`);
    const customGetPayload = await customGetResponse.json();
    expect(customGetPayload).toEqual({
      ok: true,
      method: 'GET',
      value: 'x1',
    });

    const customPutResponse = await fetch(`http://127.0.0.1:${port}/custom`, {
      method: 'PUT',
    });
    const customPutPayload = await customPutResponse.json();
    expect(customPutPayload.method).toBe('PUT');

    await runtime.close();
  });
});
