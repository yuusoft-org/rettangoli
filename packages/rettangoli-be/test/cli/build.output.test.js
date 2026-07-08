import path from 'node:path';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import build from '../../src/cli/build.js';
import {
  checkBackendBuildPlanFreshness,
  createBackendBuildPlan,
} from '../../src/cli/build.js';

describe('be build cli', () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it('generates registry and app entry without user index files', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-build-'));
    createdDirs.push(rootDir);

    const srcDir = path.join(rootDir, 'src');
    mkdirSync(path.join(srcDir, 'modules', 'health', 'ping'), { recursive: true });

    writeFileSync(path.join(srcDir, 'setup.js'), [
      'const setup = {',
      '  port: 3030,',
      '  deps: { health: {} },',
      '};',
      'export default setup;',
      '',
    ].join('\n'));

    writeFileSync(path.join(srcDir, 'modules', 'health', 'ping', 'ping.handlers.js'), 'export const healthPingMethod = async () => ({ ok: true });\n');
    writeFileSync(path.join(srcDir, 'modules', 'health', 'ping', 'ping.contract.yaml'), [
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
    writeFileSync(path.join(srcDir, 'modules', 'health', 'ping', 'ping.examples.yaml'), [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: health-ping',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '---',
      'case: ok',
      'proves:',
      '  result: success',
      'request:',
      '  id: ok',
      '  params: {}',
      'out:',
      '  result:',
      '    ok: true',
      '',
    ].join('\n'));

    const out = build({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      setup: './src/setup.js',
      outdir: './.rtgl-be/generated',
    });

    expect(out.methodCount).toBe(1);
    expect(out._private).toBeUndefined();
    expect(out.targets.every((target) => target.content === undefined)).toBe(true);
    expect(existsSync(out.registryPath)).toBe(true);
    expect(existsSync(out.appEntryPath)).toBe(true);

    const appEntry = readFileSync(out.appEntryPath, 'utf8');
    expect(appEntry).toContain('setupModule.setup ?? setupModule.createSetup ?? setupModule.default');
    expect(appEntry).toContain("await setupExport({ cwd: process.cwd(), env: process.env, mode: 'generated' })");
  });

  it('creates a deterministic dry-run build plan without writing files', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-build-plan-'));
    createdDirs.push(rootDir);

    const srcDir = path.join(rootDir, 'src');
    mkdirSync(path.join(srcDir, 'modules', 'health', 'ping'), { recursive: true });
    writeFileSync(path.join(srcDir, 'setup.js'), 'export const setup = { deps: { health: {} } };\n');
    writeFileSync(path.join(srcDir, 'modules', 'health', 'ping', 'ping.handlers.js'), 'export const healthPingMethod = async () => ({ ok: true });\n');
    writeFileSync(path.join(srcDir, 'modules', 'health', 'ping', 'ping.contract.yaml'), [
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
    writeFileSync(path.join(srcDir, 'modules', 'health', 'ping', 'ping.examples.yaml'), [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: health-ping',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '---',
      'case: ok',
      'proves:',
      '  result: success',
      'request:',
      '  id: ok',
      '  params: {}',
      'out:',
      '  result:',
      '    ok: true',
      '',
    ].join('\n'));

    const plan = createBackendBuildPlan({ cwd: rootDir });

    expect(plan.schemaVersion).toBe('rettangoli.buildPlan/v1');
    expect(plan.targets.map((target) => target.path)).toEqual([
      '.rtgl-be/generated/registry.js',
      '.rtgl-be/generated/app.js',
    ]);
    expect(plan.targets[0].hash).toMatch(/^sha256:/);
    expect(existsSync(path.join(rootDir, '.rtgl-be', 'generated', 'registry.js'))).toBe(false);

    const missingFreshness = checkBackendBuildPlanFreshness(plan);
    expect(missingFreshness.ok).toBe(false);

    build({ cwd: rootDir, silent: true });
    const currentFreshness = checkBackendBuildPlanFreshness(plan);
    expect(currentFreshness.ok).toBe(true);
  });

  it('generates an app entry with config global middleware parity', async () => {
    const rootDir = mkdtempSync(path.join(process.cwd(), '.tmp-rtgl-be-build-runtime-'));
    createdDirs.push(rootDir);

    const srcDir = path.join(rootDir, 'src');
    mkdirSync(path.join(srcDir, 'modules', 'health', 'ping'), { recursive: true });
    mkdirSync(path.join(srcDir, 'middleware'), { recursive: true });
    writeFileSync(path.join(rootDir, 'rettangoli.config.yaml'), [
      'be:',
      '  globalMiddleware:',
      '    before: [withAuth]',
      '',
    ].join('\n'));
    writeFileSync(path.join(srcDir, 'setup.js'), 'export const setup = { deps: { health: {} } };\n');
    writeFileSync(path.join(srcDir, 'middleware', 'withAuth.js'), [
      'export const withAuth = () => (next) => async (ctx) => {',
      "  ctx.authUser = { userId: 'u-1' };",
      '  return next(ctx);',
      '};',
      '',
    ].join('\n'));
    writeFileSync(path.join(srcDir, 'modules', 'health', 'ping', 'ping.handlers.js'), [
      'export const healthPingMethod = async ({ context }) => ({',
      '  ok: true,',
      '  authUser: context.authUser.userId,',
      '});',
      '',
    ].join('\n'));
    writeFileSync(path.join(srcDir, 'modules', 'health', 'ping', 'ping.contract.yaml'), [
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
      '    authUser:',
      '      type: string',
      '  required: [ok, authUser]',
      'errors: {}',
      '',
    ].join('\n'));
    writeFileSync(path.join(srcDir, 'modules', 'health', 'ping', 'ping.examples.yaml'), [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: health-ping',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '---',
      'case: ok',
      'proves:',
      '  result: success',
      'request:',
      '  id: ok',
      '  params: {}',
      'out:',
      '  result:',
      '    ok: true',
      '    authUser: u-1',
      '',
    ].join('\n'));

    const out = build({ cwd: rootDir, silent: true });

    const appEntry = readFileSync(out.appEntryPath, 'utf8');
    expect(appEntry).toContain('globalMiddlewareBefore: ["withAuth"]');
    expect(out.inputSourcePaths).toContain('rettangoli.config.yaml');

    const appModule = await import(`${pathToFileURL(out.appEntryPath).href}?t=${Date.now()}`);
    const { response } = await appModule.app.dispatchWithContext({
      request: {
        jsonrpc: '2.0',
        id: 'auth',
        method: 'health.ping',
        params: {},
      },
    });

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 'auth',
      result: {
        ok: true,
        authUser: 'u-1',
      },
    });
  });
});
