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
    expect(runCommand).not.toHaveBeenCalled();
  });
});
