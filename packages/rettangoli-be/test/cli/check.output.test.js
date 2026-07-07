import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import check from '../../src/cli/check.js';

const writeMethodFiles = ({ rootDir, includeSpec = true }) => {
  const methodDir = path.join(rootDir, 'src', 'modules', 'health', 'ping');
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

  if (includeSpec) {
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
  }
};

const writeDuplicateMiddleware = (rootDir) => {
  const middlewareDir = path.join(rootDir, 'src', 'middleware');
  mkdirSync(path.join(middlewareDir, 'nested'), { recursive: true });
  writeFileSync(path.join(middlewareDir, 'withDup.js'), 'export const withDup = () => (next) => (ctx) => next(ctx);\n');
  writeFileSync(path.join(middlewareDir, 'nested', 'withDup.js'), 'export const withDup = () => (next) => (ctx) => next(ctx);\n');
};

const writeMethodReferencingDuplicateMiddleware = (rootDir) => {
  writeMethodFiles({ rootDir, includeSpec: true });
  const contractPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.contract.yaml');
  writeFileSync(contractPath, [
    'schemaVersion: rettangoli.contract/v1',
    'method: health.ping',
    'description: ping',
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

  it('checks one method in json format', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-method-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      method: 'health.ping',
      format: 'json',
    });

    const parsed = JSON.parse(logSpy.mock.calls[0][0]);
    expect(parsed.ok).toBe(true);
    expect(parsed.method).toBe('health.ping');
    expect(parsed.methodCount).toBe(1);
  });

  it('keeps duplicate middleware errors when scoped method references that middleware', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-duplicate-mw-'));
    createdDirs.push(rootDir);
    writeMethodReferencingDuplicateMiddleware(rootDir);
    writeDuplicateMiddleware(rootDir);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      method: 'health.ping',
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = JSON.parse(logSpy.mock.calls[0][0]);
    expect(parsed.ok).toBe(false);
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-021');
  });

  it('reports missing method in method-scoped json check', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-missing-method-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      method: 'user.getProfile',
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = JSON.parse(logSpy.mock.calls[0][0]);
    expect(parsed.ok).toBe(false);
    expect(parsed.errors[0].code).toBe('RTGL-BE-CONTRACT-036');
  });

  it('reports domain error examples that are not declared in the contract', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-undeclared-error-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      "file: './ping.handlers.js'",
      'group: ping',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '---',
      'case: requires-auth',
      'proves:',
      '  error: AUTH_REQUIRED',
      'in:',
      '  - payload: {}',
      'out:',
      '  _error: true',
      '  code: AUTH_REQUIRED',
      '',
    ].join('\n'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      format: 'text',
    });

    expect(process.exitCode).toBe(1);
    const printed = errorSpy.mock.calls.map((entry) => entry[0]).join('\n');
    expect(printed).toContain('RTGL-BE-CONTRACT-031');
    expect(printed).toContain("uses undeclared error code 'AUTH_REQUIRED'");
  });

  it('allows throws examples without validating a missing out value', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-throws-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      "file: './ping.handlers.js'",
      'group: ping',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '---',
      'case: invariant-failure',
      'in:',
      '  - payload: {}',
      'throws:',
      '  message: invariant failed',
      '',
    ].join('\n'));

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

  it('validates the provided example payload value', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-payload-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      "file: './ping.handlers.js'",
      'group: ping',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '---',
      'case: invalid-payload',
      'in:',
      '  - payload: 123',
      'out:',
      '  ok: true',
      '',
    ].join('\n'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      format: 'text',
    });

    expect(process.exitCode).toBe(1);
    const printed = errorSpy.mock.calls.map((entry) => entry[0]).join('\n');
    expect(printed).toContain('RTGL-BE-CONTRACT-027');
    expect(printed).toContain("Example 'invalid-payload' payload does not match params schema");
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
