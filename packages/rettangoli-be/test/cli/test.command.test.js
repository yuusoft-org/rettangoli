import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runBackendTests } from '../../src/cli/test.js';

const writeMethod = (rootDir) => {
  const methodDir = path.join(rootDir, 'src', 'modules', 'health', 'ping');
  mkdirSync(methodDir, { recursive: true });

  writeFileSync(path.join(rootDir, 'vitest.config.js'), 'export default {};\n');
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

const writeProfileMethod = (rootDir) => {
  const methodDir = path.join(rootDir, 'src', 'modules', 'user', 'profile');
  mkdirSync(methodDir, { recursive: true });

  writeFileSync(path.join(methodDir, 'profile.handlers.js'), 'export const userProfileMethod = async () => ({ ok: true });\n');
  writeFileSync(path.join(methodDir, 'profile.contract.yaml'), [
    'schemaVersion: rettangoli.contract/v1',
    'method: user.profile',
    'description: profile',
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
  writeFileSync(path.join(methodDir, 'profile.examples.yaml'), [
    'schemaVersion: rettangoli.examples/v1',
    "file: './profile.handlers.js'",
    'group: profile',
    'mode: handler',
    '---',
    'suite: userProfileMethod',
    'exportName: userProfileMethod',
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

describe('be test command', () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it('runs only the selected method examples file', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-test-command-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: 'ok',
      stderr: '',
    }));

    const result = runBackendTests({
      cwd: rootDir,
      method: 'health.ping',
      format: 'json',
      env: {},
      runCommand,
    });

    expect(result.ok).toBe(true);
    expect(result.files).toEqual(['src/modules/health/ping/ping.examples.yaml']);
    expect(result.nextAction).toEqual({
      kind: 'verify',
      message: 'Phase passed. Run full backend verification before stopping.',
      argv: ['rtgl', 'be', 'verify', '--method', 'health.ping', '--json'],
    });
    expect(runCommand).toHaveBeenCalledWith(
      'npm',
      [
        'exec',
        '--',
        'vitest',
        'run',
        'src/modules/health/ping/ping.examples.yaml',
        '--reporter',
        'verbose',
        '--config',
        './vitest.config.js',
      ],
      expect.objectContaining({
        cwd: rootDir,
        stdio: 'pipe',
      }),
    );
  });

  it('follows caller package manager when resolving the Vitest runner', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-test-runner-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: 'ok',
      stderr: '',
    }));

    const result = runBackendTests({
      cwd: rootDir,
      method: 'health.ping',
      format: 'json',
      env: {
        npm_config_user_agent: 'bun/1.2.0',
      },
      runCommand,
    });

    expect(result.ok).toBe(true);
    expect(result.command.executable).toBe('bunx');
    expect(result.command.args[0]).toBe('vitest');
  });

  it('preserves CLI overrides in agent rerun commands', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-test-overrides-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: 'ok',
      stderr: '',
    }));

    const result = runBackendTests({
      cwd: rootDir,
      method: 'health.ping',
      middlewareDir: './src/custom-middleware',
      config: './vitest.custom.js',
      executable: 'custom-runner',
      packageManager: 'pnpm',
      format: 'json',
      runCommand,
    });

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
    expect(result.nextAction.argv).toEqual([
      'rtgl',
      'be',
      'verify',
      '--method',
      'health.ping',
      '--middleware-dir',
      './src/custom-middleware',
      '--test-config',
      './vitest.custom.js',
      '--runner',
      'custom-runner',
      '--package-manager',
      'pnpm',
      '--json',
    ]);
  });

  it('ignores unrelated contract errors when a method is selected', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-test-scoped-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);
    writeBrokenMethod(rootDir);

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: 'ok',
      stderr: '',
    }));

    const result = runBackendTests({
      cwd: rootDir,
      method: 'health.ping',
      format: 'json',
      runCommand,
    });

    expect(result.ok).toBe(true);
    expect(result.files).toEqual(['src/modules/health/ping/ping.examples.yaml']);
    expect(runCommand).toHaveBeenCalledOnce();
  });

  it('reports all candidate files for project-scoped test failures', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-test-project-fail-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);
    writeProfileMethod(rootDir);

    const runCommand = vi.fn(() => ({
      status: 1,
      stdout: 'later file failed',
      stderr: '',
    }));

    const result = runBackendTests({
      cwd: rootDir,
      format: 'json',
      env: {},
      runCommand,
    });

    const files = [
      'src/modules/health/ping/ping.examples.yaml',
      'src/modules/user/profile/profile.examples.yaml',
    ];
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0].filePath).toBeUndefined();
    expect(result.diagnostics[0].files).toEqual(files);
    expect(result.nextAction.files).toEqual(files);
  });

  it('includes runner spawn errors in test diagnostics', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-test-spawn-error-'));
    createdDirs.push(rootDir);
    writeMethod(rootDir);

    const result = runBackendTests({
      cwd: rootDir,
      format: 'json',
      executable: 'custom-runner',
      runCommand: vi.fn(() => ({
        status: null,
        stdout: '',
        stderr: '',
        error: new Error('spawn custom-runner ENOENT'),
      })),
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0].message).toContain('spawn custom-runner ENOENT');
    expect(result.diagnostics[0].outputTail.stderr).toContain('spawn custom-runner ENOENT');
  });

  it('does not run Vitest when no backend examples are found', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-test-empty-'));
    createdDirs.push(rootDir);
    mkdirSync(path.join(rootDir, 'src', 'modules'), { recursive: true });

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: 'ok',
      stderr: '',
    }));

    const result = runBackendTests({
      cwd: rootDir,
      format: 'json',
      runCommand,
    });

    expect(result.ok).toBe(false);
    expect(result.phase).toBe('examples');
    expect(result.files).toEqual([]);
    expect(result.error.code).toBe('RTGL-BE-TEST-001');
    expect(result.commands.find((command) => command.id === 'test').argv).toEqual([
      'rtgl',
      'be',
      'test',
      '--json',
    ]);
    expect(result.nextAction.argv).toEqual(['rtgl', 'be', 'test', '--json']);
    expect(runCommand).not.toHaveBeenCalled();
  });
});
