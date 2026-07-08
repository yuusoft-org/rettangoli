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

    writeFileSync(path.join(methodDir, 'ping.contract.yaml'), [
      'schemaVersion: rettangoli.contract/v1',
      'method: health.ping',
      'description: Health ping',
      'middleware:',
      '  before: [withRequestId]',
      '  after: []',
      'params:',
      '  type: object',
      '  additionalProperties: false',
      '  properties:',
      '    echo:',
      '      type: string',
      '  required: []',
      'result:',
      '  type: object',
      '  additionalProperties: false',
      '  properties:',
      '    ok:',
      '      type: boolean',
      '    echo:',
      '      type: string',
      '    requestId:',
      '      type: string',
      '    ts:',
      '      type: number',
      '  required: [ok, requestId, ts]',
      'errors: {}',
      '',
    ].join('\n'));

    writeFileSync(path.join(methodDir, 'ping.examples.yaml'), [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: health-ping',
      'mode: handler',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '---',
      'case: ok',
      'proves:',
      '  result: success',
      'in:',
      '  - payload: {}',
      'out:',
      '  ok: true',
      '  requestId: req-auto',
      '  ts: 1700000000000',
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
    writeFileSync(path.join(methodDir, 'ping.contract.yaml'), [
      'schemaVersion: rettangoli.contract/v1',
      'method: health.ping',
      'description: Health ping',
      'middleware:',
      '  before: []',
      '  after: []',
      'params:',
      '  type: object',
      '  additionalProperties: false',
      '  properties: {}',
      '  required: []',
      'result:',
      '  type: object',
      '  additionalProperties: false',
      '  properties:',
      '    ok:',
      '      type: boolean',
      '  required: [ok]',
      'errors: {}',
      '',
    ].join('\n'));
    writeFileSync(path.join(methodDir, 'ping.examples.yaml'), [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: health-ping',
      'mode: handler',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '---',
      'case: ok',
      'proves:',
      '  result: success',
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

  it('scopes runtime construction to one method', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-scoped-'));
    createdDirs.push(rootDir);

    const srcDir = path.join(rootDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(path.join(srcDir, 'setup.js'), 'export const setup = { deps: { health: {} } };\n');

    const methodDir = path.join(srcDir, 'modules', 'health', 'ping');
    mkdirSync(methodDir, { recursive: true });
    writeFileSync(path.join(methodDir, 'ping.handlers.js'), 'export const healthPingMethod = async () => ({ ok: true });\n');
    writeFileSync(path.join(methodDir, 'ping.contract.yaml'), [
      'schemaVersion: rettangoli.contract/v1',
      'method: health.ping',
      'description: Health ping',
      'middleware:',
      '  before: []',
      '  after: []',
      'params:',
      '  type: object',
      '  additionalProperties: false',
      '  properties: {}',
      '  required: []',
      'result:',
      '  type: object',
      '  additionalProperties: false',
      '  properties:',
      '    ok:',
      '      type: boolean',
      '  required: [ok]',
      'errors: {}',
      '',
    ].join('\n'));
    writeFileSync(path.join(methodDir, 'ping.examples.yaml'), [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: health-ping',
      'mode: handler',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '---',
      'case: ok',
      'proves:',
      '  result: success',
      'in:',
      '  - payload: {}',
      'out:',
      '  ok: true',
      '',
    ].join('\n'));

    const brokenDir = path.join(srcDir, 'modules', 'user', 'broken');
    mkdirSync(brokenDir, { recursive: true });
    writeFileSync(path.join(brokenDir, 'broken.handlers.js'), 'export const userBrokenMethod = async () => ({ ok: true });\n');
    writeFileSync(path.join(brokenDir, 'broken.contract.yaml'), [
      'schemaVersion: rettangoli.contract/v1',
      'method: user.broken',
      'description: Broken user method',
      'middleware:',
      '  before: []',
      '  after: []',
      'params:',
      '  type: object',
      '  additionalProperties: false',
      '  properties: {}',
      '  required: []',
      'result:',
      '  type: object',
      '  additionalProperties: false',
      '  properties:',
      '    ok:',
      '      type: boolean',
      '  required: [ok]',
      'errors: {}',
      '',
    ].join('\n'));

    await expect(createAppFromProject({
      cwd: rootDir,
      methodDirs: ['./src/modules'],
      middlewareDirs: ['./src/middleware'],
    })).rejects.toThrow('RTGL-BE-CONTRACT-005');

    const app = await createAppFromProject({
      cwd: rootDir,
      method: 'health.ping',
      methodDirs: ['./src/modules'],
      middlewareDirs: ['./src/middleware'],
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

  it('keeps duplicate middleware errors when scoped runtime references that middleware', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-scoped-duplicate-mw-'));
    createdDirs.push(rootDir);

    const srcDir = path.join(rootDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(path.join(srcDir, 'setup.js'), 'export const setup = { deps: { health: {} } };\n');

    const middlewareDir = path.join(srcDir, 'middleware');
    mkdirSync(path.join(middlewareDir, 'nested'), { recursive: true });
    writeFileSync(path.join(middlewareDir, 'withDup.js'), 'export const withDup = () => (next) => (ctx) => next(ctx);\n');
    writeFileSync(path.join(middlewareDir, 'nested', 'withDup.js'), 'export const withDup = () => (next) => (ctx) => next(ctx);\n');

    const methodDir = path.join(srcDir, 'modules', 'health', 'ping');
    mkdirSync(methodDir, { recursive: true });
    writeFileSync(path.join(methodDir, 'ping.handlers.js'), 'export const healthPingMethod = async () => ({ ok: true });\n');
    writeFileSync(path.join(methodDir, 'ping.contract.yaml'), [
      'schemaVersion: rettangoli.contract/v1',
      'method: health.ping',
      'description: Health ping',
      'middleware:',
      '  before: [withDup]',
      '  after: []',
      'params:',
      '  type: object',
      '  additionalProperties: false',
      '  properties: {}',
      '  required: []',
      'result:',
      '  type: object',
      '  additionalProperties: false',
      '  properties:',
      '    ok:',
      '      type: boolean',
      '  required: [ok]',
      'errors: {}',
      '',
    ].join('\n'));
    writeFileSync(path.join(methodDir, 'ping.examples.yaml'), [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: health-ping',
      'mode: handler',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '---',
      'case: ok',
      'proves:',
      '  result: success',
      'in:',
      '  - payload: {}',
      'out:',
      '  ok: true',
      '',
    ].join('\n'));

    await expect(createAppFromProject({
      cwd: rootDir,
      method: 'health.ping',
      methodDirs: ['./src/modules'],
      middlewareDirs: ['./src/middleware'],
    })).rejects.toThrow('RTGL-BE-CONTRACT-021');
  });
});
