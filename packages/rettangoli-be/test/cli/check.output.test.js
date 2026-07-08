import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import check, { runBackendCheck } from '../../src/cli/check.js';

const writeMethodFiles = ({ rootDir, includeSpec = true, modulesDir = 'src/modules' }) => {
  const methodDir = path.join(rootDir, modulesDir, 'health', 'ping');
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

const captureStdout = () => vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

const parseStdoutJson = (stdoutSpy) => JSON.parse(
  stdoutSpy.mock.calls.map(([chunk]) => String(chunk)).join(''),
);

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

    const stdoutSpy = captureStdout();

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = parseStdoutJson(stdoutSpy);
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

    const stdoutSpy = captureStdout();

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      method: 'health.ping',
      format: 'json',
    });

    const parsed = parseStdoutJson(stdoutSpy);
    expect(parsed.ok).toBe(true);
    expect(parsed.method).toBe('health.ping');
    expect(parsed.methodCount).toBe(1);
    expect(parsed.nextAction).toEqual({
      kind: 'verify',
      message: 'Phase passed. Run full backend verification before stopping.',
      argv: ['rtgl', 'be', 'verify', '--method', 'health.ping', '--json'],
    });
  });

  it('keeps duplicate middleware errors when scoped method references that middleware', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-duplicate-mw-'));
    createdDirs.push(rootDir);
    writeMethodReferencingDuplicateMiddleware(rootDir);
    writeDuplicateMiddleware(rootDir);

    const stdoutSpy = captureStdout();

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      method: 'health.ping',
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = parseStdoutJson(stdoutSpy);
    expect(parsed.ok).toBe(false);
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-021');
  });

  it('reports missing method in method-scoped json check', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-missing-method-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const stdoutSpy = captureStdout();

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      method: 'user.getProfile',
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = parseStdoutJson(stdoutSpy);
    expect(parsed.ok).toBe(false);
    expect(parsed.errors[0].code).toBe('RTGL-BE-CONTRACT-036');
  });

  it('reports domain error examples that are not declared in the contract', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-undeclared-error-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: ping',
      'mode: handler',
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

  it('requires a success proof example', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-success-proof-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: ping',
      'mode: handler',
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

    const stdoutSpy = captureStdout();

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = parseStdoutJson(stdoutSpy);
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-029');
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-037');
    expect(parsed.diagnostics[0].method).toBe('health.ping');
    expect(parsed.diagnostics[0].ruleId).toBe('RTGL-BE-CONTRACT-029');
    expect(parsed.diagnostics[0].rerun.argv).toEqual(['rtgl', 'be', 'check', '--format', 'json']);
  });

  it('requires explicit error proof for declared domain errors', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-error-proof-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const contractPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.contract.yaml');
    writeFileSync(contractPath, [
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
      'errors:',
      '  AUTH_REQUIRED:',
      '    description: Authentication is required.',
      '',
    ].join('\n'));

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
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
      '---',
      'case: requires-auth',
      'in:',
      '  - payload: {}',
      'out:',
      '  _error: true',
      '  code: AUTH_REQUIRED',
      '',
    ].join('\n'));

    const stdoutSpy = captureStdout();

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = parseStdoutJson(stdoutSpy);
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-034');
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-035');
  });

  it('rejects examples that claim result and error proof at the same time', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-conflicting-proof-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const contractPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.contract.yaml');
    writeFileSync(contractPath, [
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
      'errors:',
      '  AUTH_REQUIRED:',
      '    description: Authentication is required.',
      '',
    ].join('\n'));

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
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
      '---',
      'case: conflicted-auth',
      'proves:',
      '  result: success',
      '  error: AUTH_REQUIRED',
      'in:',
      '  - payload: {}',
      'out:',
      '  _error: true',
      '  code: AUTH_REQUIRED',
      '',
    ].join('\n'));

    const stdoutSpy = captureStdout();

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = parseStdoutJson(stdoutSpy);
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-040');
    expect(parsed.diagnostics.find((diagnostic) => diagnostic.ruleId === 'RTGL-BE-CONTRACT-040')).toEqual(
      expect.objectContaining({
        method: 'health.ping',
        case: 'conflicted-auth',
      }),
    );
  });

  it('validates executable input shape before treating examples as proof', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-input-shape-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: ping',
      'mode: handler',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '---',
      'case: bad-call-shape',
      'proves:',
      '  result: success',
      'in:',
      '  - 123',
      'out:',
      '  ok: true',
      '',
    ].join('\n'));

    const stdoutSpy = captureStdout();

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = parseStdoutJson(stdoutSpy);
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-039');
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-037');
    expect(parsed.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-CONTRACT-039',
      method: 'health.ping',
      case: 'bad-call-shape',
    }));
  });

  it('requires at least one case document in examples', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-empty-examples-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: ping',
      'mode: handler',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '',
    ].join('\n'));

    const stdoutSpy = captureStdout();

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = parseStdoutJson(stdoutSpy);
    expect(parsed.errors.map((error) => error.code)).toEqual(['RTGL-BE-CONTRACT-038']);
    expect(parsed.diagnostics[0].fix).toContain('case document');
  });

  it('validates the provided example payload value', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-payload-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: ping',
      'mode: handler',
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

    const stdoutSpy = captureStdout();

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = parseStdoutJson(stdoutSpy);
    expect(parsed.summary.byCode[0].code).toBe('RTGL-BE-CONTRACT-022');
  });

  it('rejects non-object params and result schemas', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-schema-shape-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const contractPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.contract.yaml');
    writeFileSync(contractPath, [
      'schemaVersion: rettangoli.contract/v1',
      'method: health.ping',
      'description: ping',
      'middleware:',
      '  before: []',
      '  after: []',
      'params:',
      '  type: array',
      '  items:',
      '    type: string',
      'result:',
      '  type: object',
      '  additionalProperties: false',
      '  properties:',
      '    error:',
      '      type: string',
      '    _error:',
      '      type: boolean',
      '  required: []',
      'errors: {}',
      '',
    ].join('\n'));

    const stdoutSpy = captureStdout();

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = parseStdoutJson(stdoutSpy);
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-042');
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-044');
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-045');
  });

  it('rejects invalid examples headers', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-examples-header-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      'schemaVersion: wrong/v1',
      "file: '../other.handlers.js'",
      'group: ping',
      'mode: rpc',
      '---',
      'suite: ""',
      'exportName: ""',
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

    const stdoutSpy = captureStdout();

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = parseStdoutJson(stdoutSpy);
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-046');
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-047');
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-048');
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-049');
    expect(parsed.diagnostics[0].schemaVersion).toBe('rettangoli.diagnostic/v1');
  });

  it('reports unsupported method package files', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-bad-method-file-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });
    writeFileSync(path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.rpc.yaml'), 'method: health.ping\n');

    const stdoutSpy = captureStdout();

    check({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      format: 'json',
    });

    expect(process.exitCode).toBe(1);
    const parsed = parseStdoutJson(stdoutSpy);
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-041');
  });

  it('discovers methods relative to configured method dirs without requiring a modules path segment', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-custom-dir-'));
    createdDirs.push(rootDir);
    writeMethodFiles({
      rootDir,
      includeSpec: true,
      modulesDir: 'backend/methods',
    });

    const result = runBackendCheck({
      cwd: rootDir,
      dirs: ['./backend/methods'],
      method: 'health.ping',
      format: 'json',
    });

    expect(result.ok).toBe(true);
    expect(result.scope).toEqual({
      type: 'method',
      methods: ['health.ping'],
      provesProject: false,
    });
    expect(result.nextAction.argv).toEqual([
      'rtgl',
      'be',
      'verify',
      '--dir',
      './backend/methods',
      '--method',
      'health.ping',
      '--json',
    ]);
  });
});
