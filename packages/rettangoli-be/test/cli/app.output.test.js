import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { runBackendAppCheck } from '../../src/cli/app.js';

const writeMethod = (rootDir) => {
  const srcDir = path.join(rootDir, 'src');
  const methodDir = path.join(srcDir, 'modules', 'health', 'ping');
  mkdirSync(methodDir, { recursive: true });
  writeFileSync(path.join(srcDir, 'setup.js'), 'export const setup = { deps: { health: {} } };\n');
  writeFileSync(path.join(methodDir, 'ping.handlers.js'), 'export const healthPingMethod = () => ({ ok: true });\n');
  writeFileSync(path.join(methodDir, 'ping.contract.yaml'), [
    'schemaVersion: rettangoli.contract/v1',
    'method: health.ping',
    'description: ping',
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
    'group: ping',
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
};

describe('be app check command', () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => rmSync(dirPath, { recursive: true, force: true }));
    createdDirs.length = 0;
  });

  it('imports setup, handlers, middleware, and instantiates the app', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-check-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);

    const result = await runBackendAppCheck({ cwd: rootDir });

    expect(result.ok).toBe(true);
    expect(result.artifactSchemaVersion).toBe('rettangoli.appCheck/v1');
    expect(result.scope).toEqual({
      type: 'project',
      methods: ['health.ping'],
      provesProject: true,
    });
    expect(result.files).toContain('src/setup.js');
    expect(result.files).toContain('src/modules/health/ping/ping.handlers.js');
    expect(result.nextAction.kind).toBe('verify');
  });

  it('fails when setup deps for a method domain are missing', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-check-missing-deps-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);
    writeFileSync(path.join(rootDir, 'src', 'setup.js'), 'export const setup = { deps: {} };\n');

    const result = await runBackendAppCheck({ cwd: rootDir, method: 'health.ping' });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-APP-006',
      phase: 'app',
      method: 'health.ping',
      filePath: 'src/setup.js',
    }));
    expect(result.nextAction).toEqual(expect.objectContaining({
      kind: 'fix',
      phase: 'app',
      target: 'runtime-app',
    }));
  });

  it('points invalid handler exports at the handler file', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-check-handler-export-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);
    writeFileSync(
      path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.handlers.js'),
      'export const first = () => ({ ok: true });\nexport const second = () => ({ ok: true });\n',
    );

    const result = await runBackendAppCheck({ cwd: rootDir });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-APP-010',
      phase: 'app',
      method: 'health.ping',
      filePath: 'src/modules/health/ping/ping.handlers.js',
    }));
    expect(result.nextAction.files).toEqual(['src/modules/health/ping/ping.handlers.js']);
  });

  it('points invalid middleware exports at the middleware file', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-check-middleware-export-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);
    writeFileSync(path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.contract.yaml'), [
      'schemaVersion: rettangoli.contract/v1',
      'method: health.ping',
      'description: ping',
      'middleware:',
      '  before: [auth]',
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
    mkdirSync(path.join(rootDir, 'src', 'middleware'), { recursive: true });
    writeFileSync(path.join(rootDir, 'src', 'middleware', 'auth.js'), 'export const auth = () => "not middleware";\n');

    const result = await runBackendAppCheck({ cwd: rootDir });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-APP-011',
      phase: 'app',
      filePath: 'src/middleware/auth.js',
    }));
    expect(result.nextAction.files).toEqual(['src/middleware/auth.js']);
  });

  it('validates unused middleware for project runtime checks', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-check-unused-middleware-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);
    mkdirSync(path.join(rootDir, 'src', 'middleware'), { recursive: true });
    writeFileSync(path.join(rootDir, 'src', 'middleware', 'unused.js'), 'export const unused = () => "not middleware";\n');

    const projectResult = await runBackendAppCheck({ cwd: rootDir });
    const methodResult = await runBackendAppCheck({ cwd: rootDir, method: 'health.ping' });

    expect(projectResult.ok).toBe(false);
    expect(projectResult.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-APP-011',
      filePath: 'src/middleware/unused.js',
    }));
    expect(methodResult.ok).toBe(true);
  });

  it('uses runtime-equivalent middleware defaults during app instantiation', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-check-middleware-defaults-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);
    writeFileSync(path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.contract.yaml'), [
      'schemaVersion: rettangoli.contract/v1',
      'method: health.ping',
      'description: ping',
      'middleware:',
      '  before: [withRequestId]',
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
    mkdirSync(path.join(rootDir, 'src', 'middleware'), { recursive: true });
    writeFileSync(path.join(rootDir, 'src', 'middleware', 'withRequestId.js'), [
      'export const withRequestId = ({ createId }) => {',
      "  if (typeof createId !== 'function') throw new Error('createId required');",
      '  return async (ctx, next) => next();',
      '};',
      '',
    ].join('\n'));

    const result = await runBackendAppCheck({ cwd: rootDir });

    expect(result.ok).toBe(true);
    expect(result.middlewareCount).toBe(1);
  });

  it('validates configured global middleware', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-check-global-middleware-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);
    mkdirSync(path.join(rootDir, 'src', 'middleware'), { recursive: true });
    writeFileSync(path.join(rootDir, 'src', 'middleware', 'globalBefore.js'), 'export const globalBefore = () => "not middleware";\n');

    const result = await runBackendAppCheck({
      cwd: rootDir,
      globalMiddlewareBefore: ['globalBefore'],
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-APP-011',
      filePath: 'src/middleware/globalBefore.js',
    }));
  });

  it('validates configured global middleware in method scope', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-check-method-global-middleware-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);
    mkdirSync(path.join(rootDir, 'src', 'middleware'), { recursive: true });
    writeFileSync(path.join(rootDir, 'src', 'middleware', 'globalBefore.js'), 'export const globalBefore = () => "not middleware";\n');

    const result = await runBackendAppCheck({
      cwd: rootDir,
      method: 'health.ping',
      globalMiddlewareBefore: ['globalBefore'],
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-APP-011',
      filePath: 'src/middleware/globalBefore.js',
    }));
  });

  it('points middleware factory exceptions at the middleware file', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-check-middleware-throw-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);
    mkdirSync(path.join(rootDir, 'src', 'middleware'), { recursive: true });
    writeFileSync(path.join(rootDir, 'src', 'middleware', 'globalBefore.js'), [
      'export const globalBefore = () => {',
      "  throw new Error('missing middleware dependency');",
      '};',
      '',
    ].join('\n'));

    const result = await runBackendAppCheck({
      cwd: rootDir,
      globalMiddlewareBefore: ['globalBefore'],
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-APP-011',
      filePath: 'src/middleware/globalBefore.js',
    }));
    expect(result.diagnostics[0].message).toContain('missing middleware dependency');
  });
});
