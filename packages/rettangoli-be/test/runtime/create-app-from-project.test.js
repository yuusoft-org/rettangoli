import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { createAppFromProject } from '../../src/runtime/createAppFromProject.js';

describe('createAppFromProject', () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it('discovers setup/method files directly with no user index.js', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-'));
    createdDirs.push(rootDir);

    const setupDir = path.join(rootDir, 'src');
    mkdirSync(setupDir, { recursive: true });

    writeFileSync(path.join(setupDir, 'setup.js'), [
      'export const setup = {',
      '  port: 3030,',
      '  deps: {',
      '    health: {',
      '      now: () => 1700000000000,',
      '    },',
      '  },',
      '};',
      '',
    ].join('\n'));

    const middlewareDir = path.join(rootDir, 'src', 'middleware');
    mkdirSync(middlewareDir, { recursive: true });

    writeFileSync(path.join(middlewareDir, 'withRequestId.js'), [
      'export const withRequestId = ({ createId }) => {',
      '  return (next) => async (ctx) => {',
      '    ctx.requestId = ctx.requestId || createId();',
      '    return next(ctx);',
      '  };',
      '};',
      '',
    ].join('\n'));

    const methodDir = path.join(rootDir, 'src', 'modules', 'health', 'ping');
    mkdirSync(methodDir, { recursive: true });

    writeFileSync(path.join(methodDir, 'ping.handlers.js'), [
      'export const healthPingMethod = async ({ payload, context, deps }) => {',
      '  return {',
      '    ok: true,',
      '    echo: payload.echo,',
      '    requestId: context.requestId,',
      '    ts: deps.now(),',
      '  };',
      '};',
      '',
    ].join('\n'));

    writeFileSync(path.join(methodDir, 'ping.rpc.yaml'), [
      'method: health.ping',
      'description: Health ping',
      'middleware:',
      '  before: [withRequestId]',
      '  after: []',
      'paramsSchema:',
      '  type: object',
      '  additionalProperties: false',
      '  properties:',
      '    echo:',
      '      type: string',
      '  required: []',
      'outputSchema:',
      '  success:',
      '    type: object',
      '    additionalProperties: false',
      '    properties:',
      '      ok:',
      '        type: boolean',
      '      echo:',
      '        type: string',
      '      requestId:',
      '        type: string',
      '      ts:',
      '        type: number',
      '    required: [ok, requestId, ts]',
      '  error:',
      '    type: object',
      '    additionalProperties: false',
      '    properties:',
      '      _error:',
      '        const: true',
      '      type:',
      '        type: string',
      '    required: [_error, type]',
      '',
    ].join('\n'));

    writeFileSync(path.join(methodDir, 'ping.spec.yaml'), [
      "file: './ping.handlers.js'",
      'group: health-ping',
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

    const app = await createAppFromProject({
      cwd: rootDir,
      methodDirs: ['./src/modules'],
      middlewareDirs: ['./src/middleware'],
      setupPath: './src/setup.js',
      createRequestId: () => 'req-auto',
    });

    const response = await app.dispatch({
      request: {
        jsonrpc: '2.0',
        id: '1',
        method: 'health.ping',
        params: {
          echo: 'ok',
        },
      },
    });

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: '1',
      result: {
        ok: true,
        echo: 'ok',
        requestId: 'req-auto',
        ts: 1700000000000,
      },
    });
  });

  it('supports default setup export', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-default-'));
    createdDirs.push(rootDir);

    const srcDir = path.join(rootDir, 'src');
    mkdirSync(srcDir, { recursive: true });

    writeFileSync(path.join(srcDir, 'setup.js'), [
      'const setup = {',
      '  port: 3031,',
      '  deps: { health: {} },',
      '};',
      'export default setup;',
      '',
    ].join('\n'));

    const methodDir = path.join(srcDir, 'modules', 'health', 'ping');
    mkdirSync(methodDir, { recursive: true });

    writeFileSync(path.join(methodDir, 'ping.handlers.js'), 'export const healthPingMethod = async () => ({ ok: true });\n');
    writeFileSync(path.join(methodDir, 'ping.rpc.yaml'), [
      'method: health.ping',
      'description: Health ping',
      'middleware:',
      '  before: []',
      '  after: []',
      'paramsSchema:',
      '  type: object',
      '  additionalProperties: false',
      '  properties: {}',
      '  required: []',
      'outputSchema:',
      '  success:',
      '    type: object',
      '    additionalProperties: false',
      '    properties:',
      '      ok:',
      '        type: boolean',
      '    required: [ok]',
      '  error:',
      '    type: object',
      '    additionalProperties: false',
      '    properties:',
      '      _error:',
      '        const: true',
      '      type:',
      '        type: string',
      '    required: [_error, type]',
      '',
    ].join('\n'));
    writeFileSync(path.join(methodDir, 'ping.spec.yaml'), [
      "file: './ping.handlers.js'",
      'group: health-ping',
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

    const app = await createAppFromProject({
      cwd: rootDir,
      methodDirs: ['./src/modules'],
      middlewareDirs: ['./src/middleware'],
      setupPath: './src/setup.js',
    });

    const response = await app.dispatch({
      request: {
        jsonrpc: '2.0',
        id: '1',
        method: 'health.ping',
        params: {},
      },
    });

    expect(response.result.ok).toBe(true);
  });
});
