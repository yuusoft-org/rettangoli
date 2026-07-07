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
      runCommand,
    });

    expect(result.ok).toBe(true);
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
});
