import path from 'node:path';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runBackendVerify } from '../../src/cli/verify.js';

const writeProject = (rootDir) => {
  const srcDir = path.join(rootDir, 'src');
  mkdirSync(srcDir, { recursive: true });
  writeFileSync(path.join(srcDir, 'setup.js'), [
    'export const setup = {',
    '  deps: { health: {} },',
    '};',
    '',
  ].join('\n'));
  writeFileSync(path.join(rootDir, 'vitest.config.js'), 'export default {};\n');

  const methodDir = path.join(srcDir, 'modules', 'health', 'ping');
  mkdirSync(methodDir, { recursive: true });
  writeFileSync(path.join(methodDir, 'ping.handlers.js'), 'export const healthPingMethod = async () => ({ ok: true });\n');
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
    "file: './ping.handlers.js'",
    'group: ping',
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

const writeBrokenMethod = (rootDir) => {
  const methodDir = path.join(rootDir, 'src', 'modules', 'user', 'broken');
  mkdirSync(methodDir, { recursive: true });
  writeFileSync(path.join(methodDir, 'broken.handlers.js'), 'export const userBrokenMethod = async () => ({ ok: true });\n');
  writeFileSync(path.join(methodDir, 'broken.contract.yaml'), [
    'schemaVersion: rettangoli.contract/v1',
    'method: user.broken',
    'description: broken',
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
};

describe('be verify output', () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it('returns check, build, manifest, and test results', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = runBackendVerify({
      cwd: rootDir,
      runCommand,
    });

    expect(result.schemaVersion).toBe('rettangoli.verify/v1');
    expect(result.ok).toBe(true);
    expect(result.scope).toEqual({
      type: 'project',
      methods: ['health.ping'],
      provesProject: true,
    });
    expect(result.failedPhase).toBeUndefined();
    expect(result.steps).toEqual([
      { id: 'check', ok: true },
      { id: 'build', ok: true, skipped: false },
      { id: 'manifest', ok: true, skipped: false },
      { id: 'test', ok: true, skipped: false },
    ]);
    expect(result.commands.find((command) => command.id === 'verify').argv).toEqual([
      'rtgl',
      'be',
      'verify',
      '--json',
    ]);
    expect(result.files.owned).toEqual([
      'src/modules/health/ping/ping.contract.yaml',
      'src/modules/health/ping/ping.examples.yaml',
      'src/modules/health/ping/ping.handlers.js',
    ]);
    expect(result.nextAction.kind).toBe('done');
    expect(result.check.ok).toBe(true);
    expect(result.build.scope).toBe('project');
    expect(result.manifest.hash).toMatch(/^sha256:/);
    expect(result.test.files).toEqual(['src/modules/health/ping/ping.examples.yaml']);
    expect(existsSync(path.join(rootDir, '.rtgl-be', 'generated', 'registry.js'))).toBe(true);
    expect(runCommand).toHaveBeenCalledOnce();
  });

  it('keeps method-scoped verify isolated from unrelated broken methods', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-scoped-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);
    writeBrokenMethod(rootDir);

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = runBackendVerify({
      cwd: rootDir,
      method: 'health.ping',
      env: {},
      runCommand,
    });

    expect(result.ok).toBe(true);
    expect(result.scope).toEqual({
      type: 'method',
      methods: ['health.ping'],
      provesProject: false,
    });
    expect(result.commands.find((command) => command.id === 'verify').argv).toEqual([
      'rtgl',
      'be',
      'verify',
      '--method',
      'health.ping',
      '--json',
    ]);
    expect(result.build).toEqual({
      ok: true,
      scope: 'method',
      method: 'health.ping',
      generated: false,
      methodCount: 1,
    });
    expect(result.manifest.methods).toEqual(['health.ping']);
    expect(result.test.files).toEqual(['src/modules/health/ping/ping.examples.yaml']);
  });

  it('preserves CLI overrides in verify rerun commands', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-overrides-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = runBackendVerify({
      cwd: rootDir,
      method: 'health.ping',
      middlewareDir: './src/custom-middleware',
      setup: './src/custom-setup.js',
      outdir: './custom-generated',
      testConfig: './vitest.custom.js',
      executable: 'custom-runner',
      packageManager: 'pnpm',
      env: {},
      runCommand,
    });

    expect(result.commands.find((command) => command.id === 'check').argv).toEqual([
      'rtgl',
      'be',
      'check',
      '--method',
      'health.ping',
      '--middleware-dir',
      './src/custom-middleware',
      '--format',
      'json',
    ]);
    expect(result.commands.find((command) => command.id === 'test').argv).toEqual([
      'rtgl',
      'be',
      'test',
      '--method',
      'health.ping',
      '--middleware-dir',
      './src/custom-middleware',
      '--config',
      './vitest.custom.js',
      '--runner',
      'custom-runner',
      '--package-manager',
      'pnpm',
      '--json',
    ]);
    expect(result.commands.find((command) => command.id === 'verify').argv).toEqual([
      'rtgl',
      'be',
      'verify',
      '--method',
      'health.ping',
      '--middleware-dir',
      './src/custom-middleware',
      '--setup-path',
      './src/custom-setup.js',
      '--outdir',
      './custom-generated',
      '--test-config',
      './vitest.custom.js',
      '--runner',
      'custom-runner',
      '--package-manager',
      'pnpm',
      '--json',
    ]);
  });

  it('returns agent-ready check failure details', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-check-fail-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);

    writeFileSync(path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml'), [
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

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = runBackendVerify({
      cwd: rootDir,
      method: 'health.ping',
      env: {},
      runCommand,
    });

    expect(result.ok).toBe(false);
    expect(result.failedPhase).toBe('check');
    expect(result.build).toBeUndefined();
    expect(result.test).toBeUndefined();
    expect(result.diagnostics.map((diagnostic) => diagnostic.ruleId)).toContain('RTGL-BE-CONTRACT-029');
    expect(result.diagnostics[0].filePath).toBe('src/modules/health/ping/ping.examples.yaml');
    expect(result.nextAction.argv).toEqual([
      'rtgl',
      'be',
      'check',
      '--method',
      'health.ping',
      '--format',
      'json',
    ]);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('reports no examples without running Vitest', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-empty-'));
    createdDirs.push(rootDir);
    mkdirSync(path.join(rootDir, 'src', 'modules'), { recursive: true });
    writeFileSync(path.join(rootDir, 'vitest.config.js'), 'export default {};\n');
    writeFileSync(path.join(rootDir, 'src', 'setup.js'), 'export const setup = { deps: {} };\n');

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = runBackendVerify({
      cwd: rootDir,
      runCommand,
    });

    expect(result.ok).toBe(false);
    expect(result.failedPhase).toBe('examples');
    expect(result.test.phase).toBe('examples');
    expect(result.diagnostics[0].ruleId).toBe('RTGL-BE-TEST-001');
    expect(result.nextAction.argv).toEqual(['rtgl', 'be', 'test', '--json']);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('includes bounded test output when executable examples fail', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-test-fail-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);

    const runCommand = vi.fn(() => ({
      status: 1,
      stdout: 'stdout failure details',
      stderr: 'stderr failure details',
    }));

    const result = runBackendVerify({
      cwd: rootDir,
      method: 'health.ping',
      env: {},
      runCommand,
    });

    expect(result.ok).toBe(false);
    expect(result.failedPhase).toBe('test');
    expect(result.test.exitCode).toBe(1);
    expect(result.test.command.argv[0]).toBe('npm');
    expect(result.diagnostics[0].ruleId).toBe('RTGL-BE-TEST-002');
    expect(result.diagnostics[0].outputTail).toEqual({
      stdout: 'stdout failure details',
      stderr: 'stderr failure details',
    });
  });
});
