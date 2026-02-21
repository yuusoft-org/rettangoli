import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import check from '../../src/cli/check.js';

const writeMethodFiles = ({ rootDir, includeSpec = true }) => {
  const methodDir = path.join(rootDir, 'src', 'modules', 'health', 'ping');
  mkdirSync(methodDir, { recursive: true });

  writeFileSync(path.join(methodDir, 'ping.handlers.js'), 'export const healthPingMethod = async () => ({ ok: true });\n');
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

  if (includeSpec) {
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
  }
};

describe('be check cli output', () => {
  const createdDirs = [];
  const originalExitCode = process.exitCode;

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  it('prints grouped text report and sets non-zero exit code on failure', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-text-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: false });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      format: 'text',
    });

    expect(process.exitCode).toBe(1);
    const printed = errorSpy.mock.calls.map((entry) => entry[0]).join('\n');
    expect(printed).toContain('[Check] RPC contract validation failed:');
    expect(printed).toContain('RTGL-BE-CONTRACT-005');
  });

  it('prints machine-readable json report', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-json-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: false });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = JSON.parse(logSpy.mock.calls[0][0]);
    expect(parsed.ok).toBe(false);
    expect(parsed.summary.total).toBe(1);
    expect(parsed.summary.byCode[0].code).toBe('RTGL-BE-CONTRACT-005');
  });

  it('passes when middleware directory is missing and no middleware is referenced', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-no-mw-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      format: 'text',
    });

    expect(process.exitCode).not.toBe(1);
    expect(logSpy.mock.calls.map((entry) => entry[0]).join('\n')).toContain(
      '[Check] RPC contracts passed for 1 method(s).',
    );
  });

  it('reports missing method directory as contract error', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-missing-dir-'));
    createdDirs.push(rootDir);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = JSON.parse(logSpy.mock.calls[0][0]);
    expect(parsed.summary.byCode[0].code).toBe('RTGL-BE-CONTRACT-022');
  });
});
