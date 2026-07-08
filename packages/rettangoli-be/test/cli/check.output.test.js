import path from 'node:path';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import check, { runBackendCheck } from '../../src/cli/check.js';

const exampleHeader = ({ group = 'ping', suite = 'healthPingMethod', exportName = 'healthPingMethod' } = {}) => [
  'schemaVersion: rettangoli.examples/v1',
  "file: './ping.handlers.js'",
  `group: ${group}`,
  '---',
  `suite: ${suite}`,
  `exportName: ${exportName}`,
];

const successExample = ({
  caseName = 'ok',
  id = 'req-1',
  includeProof = true,
  params = '{}',
  result = ['    ok: true'],
} = {}) => [
  '---',
  `case: ${caseName}`,
  ...(includeProof ? [
    'proves:',
    '  result: success',
  ] : []),
  'request:',
  `  id: ${id}`,
  `  params: ${params}`,
  'out:',
  '  result:',
  ...result,
];

const domainErrorExample = ({
  caseName = 'requires-auth',
  id = 'req-error',
  errorCode = 'AUTH_REQUIRED',
  includeProof = true,
  details = [],
  message = 'Domain error',
} = {}) => [
  '---',
  `case: ${caseName}`,
  ...(includeProof ? [
    'proves:',
    `  error: ${errorCode}`,
  ] : []),
  'request:',
  `  id: ${id}`,
  '  params: {}',
  'out:',
  '  error:',
  '    code: -32000',
  `    message: ${message}`,
  '    data:',
  `      code: ${errorCode}`,
  ...details,
];

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
      ...exampleHeader(),
      ...successExample(),
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

  it('accepts minimal contracts and headerless examples', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-minimal-'));
    createdDirs.push(rootDir);
    const methodDir = path.join(rootDir, 'src', 'modules', 'health', 'ping');
    mkdirSync(methodDir, { recursive: true });
    writeFileSync(path.join(methodDir, 'ping.handlers.js'), [
      'export const healthPingMethod = async ({ payload }) => {',
      '  if (payload.fail) return { _error: true, code: "UNAVAILABLE", details: { reason: "down" } };',
      '  return { ok: true };',
      '};',
      '',
    ].join('\n'));
    writeFileSync(path.join(methodDir, 'ping.contract.yaml'), [
      'id: health.ping',
      'params:',
      '  schema:',
      '    type: object',
      '    additionalProperties: false',
      '    properties:',
      '      fail:',
      '        type: boolean',
      '    required: []',
      'result:',
      '  schema:',
      '    type: object',
      '    additionalProperties: false',
      '    properties:',
      '      ok:',
      '        type: boolean',
      '    required: [ok]',
      'errors:',
      '  UNAVAILABLE:',
      '    description: dependency is down',
      '    details:',
      '      type: object',
      '      additionalProperties: false',
      '      properties:',
      '        reason:',
      '          const: down',
      '      required: [reason]',
      '',
    ].join('\n'));
    writeFileSync(path.join(methodDir, 'ping.examples.yaml'), [
      'case: ok',
      'request:',
      '  id: ok',
      '  meta:',
      '    tenantId: acme',
      '  params: {}',
      'out:',
      '  result:',
      '    ok: true',
      '---',
      'case: unavailable',
      'request:',
      '  id: unavailable',
      '  params:',
      '    fail: true',
      'throws: UNAVAILABLE',
      '',
    ].join('\n'));

    const result = runBackendCheck({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
    });

    expect(result.ok).toBe(true);
    expect(result.methodCount).toBe(1);
  });

  it('rejects conflicting example meta aliases', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-meta-conflict-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });
    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      ...exampleHeader(),
      '---',
      'case: ok',
      'request:',
      '  id: ok',
      '  meta:',
      '    tenantId: request',
      '  params: {}',
      'meta:',
      '  tenantId: top',
      'out:',
      '  result:',
      '    ok: true',
      '',
    ].join('\n'));

    const result = runBackendCheck({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe('RTGL-BE-CONTRACT-050');
    expect(result.errors[0].message).toContain('top-level meta and request.meta');
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
      ...exampleHeader(),
      ...domainErrorExample(),
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

  it('rejects the removed examples mode field', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-mode-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: ping',
      'mode: rpc',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      ...successExample(),
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
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-048');
  });

  it('infers success proof from result examples', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-success-proof-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      ...exampleHeader(),
      ...successExample({ includeProof: false }),
      '',
    ].join('\n'));

    const result = runBackendCheck({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
    });

    expect(result.ok).toBe(true);
  });

  it('infers error proof from domain error examples', () => {
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
      ...exampleHeader(),
      ...successExample(),
      ...domainErrorExample({ includeProof: false }),
      '',
    ].join('\n'));

    const result = runBackendCheck({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
    });

    expect(result.ok).toBe(true);
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
      ...exampleHeader(),
      ...successExample(),
      '---',
      'case: conflicted-auth',
      'proves:',
      '  result: success',
      '  error: AUTH_REQUIRED',
      'request:',
      '  id: req-conflict',
      '  params: {}',
      'out:',
      '  error:',
      '    code: -32000',
      '    message: Domain error',
      '    data:',
      '      code: AUTH_REQUIRED',
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

  it('validates executable request shape before treating examples as proof', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-input-shape-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      ...exampleHeader(),
      '---',
      'case: bad-call-shape',
      'proves:',
      '  result: success',
      'request: 123',
      'out:',
      '  result:',
      '    ok: true',
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
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-050');
    expect(parsed.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-037');
    expect(parsed.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-CONTRACT-050',
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
      ...exampleHeader(),
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
      ...exampleHeader(),
      '---',
      'case: invalid-payload',
      'request:',
      '  id: req-invalid',
      '  params: 123',
      'out:',
      '  result:',
      '    ok: true',
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
    expect(printed).toContain("RPC example 'invalid-payload' params do not match params schema");
  });

  it('accepts examples that prove the JSON-RPC response envelope', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-rpc-examples-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      ...exampleHeader({ suite: 'healthPingRpc' }),
      ...successExample(),
      '',
    ].join('\n'));

    const result = runBackendCheck({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
    });

    expect(result.ok).toBe(true);
  });

  it('accepts explicit JSON-RPC request and response fields when they match defaults', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-rpc-explicit-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      ...exampleHeader({ suite: 'healthPingRpc' }),
      '---',
      'case: explicit-ok',
      'proves:',
      '  result: success',
      'request:',
      "  jsonrpc: '2.0'",
      '  id: req-1',
      '  method: health.ping',
      '  params: {}',
      'out:',
      "  jsonrpc: '2.0'",
      '  id: req-1',
      '  result:',
      '    ok: true',
      '',
    ].join('\n'));

    const result = runBackendCheck({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
    });

    expect(result.ok).toBe(true);
  });

  it('rejects explicit JSON-RPC request fields that disagree with the contract', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-rpc-invalid-request-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      ...exampleHeader({ suite: 'healthPingRpc' }),
      '---',
      'case: bad-jsonrpc',
      'proves:',
      '  result: success',
      'request:',
      "  jsonrpc: '1.0'",
      '  id: req-1',
      '  params: {}',
      'out:',
      '  result:',
      '    ok: true',
      '---',
      'case: bad-method',
      'proves:',
      '  result: success',
      'request:',
      '  id: req-2',
      '  method: health.other',
      '  params: {}',
      'out:',
      '  result:',
      '    ok: true',
      '',
    ].join('\n'));

    const result = runBackendCheck({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-050');
    expect(result.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-051');
    expect(result.errors.map((error) => error.message).join('\n')).toContain("request.jsonrpc must be '2.0'");
    expect(result.errors.map((error) => error.message).join('\n')).toContain("request.method must be 'health.ping'");
  });

  it('rejects examples with invalid JSON-RPC response envelopes', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-rpc-invalid-envelope-'));
    createdDirs.push(rootDir);
    writeMethodFiles({ rootDir, includeSpec: true });

    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      ...exampleHeader({ suite: 'healthPingRpc' }),
      '---',
      'case: ok',
      'proves:',
      '  result: success',
      'request:',
      '  id: req-1',
      '  params: {}',
      'out:',
      "  jsonrpc: '1.0'",
      '  id: different-id',
      '  extra: unsupported',
      '  result:',
      '    ok: true',
      '',
    ].join('\n'));

    const result = runBackendCheck({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-052');
    expect(result.errors.map((error) => error.message).join('\n')).toContain('response.jsonrpc must be');
    expect(result.errors.map((error) => error.message).join('\n')).toContain('response.id must match request.id');
    expect(result.errors.map((error) => error.message).join('\n')).toContain('response contains unsupported field');
  });

  it('validates domain error envelopes and details', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-rpc-error-envelope-'));
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
      '  HEALTH_DOWN:',
      '    message: Health is down',
      '    details:',
      '      type: object',
      '      additionalProperties: false',
      '      properties:',
      '        reason:',
      '          type: string',
      '      required: [reason]',
      '',
    ].join('\n'));
    const examplesPath = path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml');
    writeFileSync(examplesPath, [
      ...exampleHeader({ suite: 'healthPingRpc' }),
      ...successExample(),
      '---',
      'case: down',
      'proves:',
      '  error: HEALTH_DOWN',
      'request:',
      '  id: req-2',
      '  params: {}',
      'out:',
      '  error:',
      '    code: -32000',
      '    message: Wrong message',
      '    data:',
      '      code: HEALTH_DOWN',
      '      details:',
      '        reason: unavailable',
      '',
    ].join('\n'));

    const wrongMessageResult = runBackendCheck({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
    });
    expect(wrongMessageResult.ok).toBe(false);
    expect(wrongMessageResult.errors.map((error) => error.message).join('\n')).toContain('error.message: Domain error');

    writeFileSync(examplesPath, readFileSync(examplesPath, 'utf8').replace('    message: Wrong message', '    message: Domain error'));
    const fixedMessageResult = runBackendCheck({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
    });
    expect(fixedMessageResult.ok).toBe(true);

    writeFileSync(examplesPath, readFileSync(examplesPath, 'utf8').replace('        reason: unavailable', [
      '        reason: unavailable',
      '      extra: unsupported',
    ].join('\n')));
    const extraDataResult = runBackendCheck({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
    });
    expect(extraDataResult.ok).toBe(false);
    expect(extraDataResult.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-052');

    writeFileSync(examplesPath, readFileSync(examplesPath, 'utf8').replace([
      '        reason: unavailable',
      '      extra: unsupported',
    ].join('\n'), '        reason: unavailable'));
    const validResult = runBackendCheck({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
    });
    expect(validResult.ok).toBe(true);

    writeFileSync(examplesPath, readFileSync(examplesPath, 'utf8').replace('        reason: unavailable', '        reason: 123'));
    const invalidResult = runBackendCheck({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
    });
    expect(invalidResult.ok).toBe(false);
    expect(invalidResult.errors.map((error) => error.code)).toContain('RTGL-BE-CONTRACT-033');

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
      'mode: transport',
      '---',
      'suite: ""',
      'exportName: ""',
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

  it('loads configured method dirs for package-level checks', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-config-dir-'));
    createdDirs.push(rootDir);
    writeMethodFiles({
      rootDir,
      includeSpec: true,
      modulesDir: 'backend/methods',
    });
    writeFileSync(path.join(rootDir, 'rettangoli.config.yaml'), [
      'be:',
      '  dirs: [./backend/methods]',
      '',
    ].join('\n'));

    const result = runBackendCheck({
      cwd: rootDir,
      format: 'json',
    });

    expect(result.ok).toBe(true);
    expect(result.methodCount).toBe(1);
    expect(result.scope).toEqual({
      type: 'project',
      methods: ['health.ping'],
      provesProject: true,
    });
    expect(result.nextAction.argv).toEqual([
      'rtgl',
      'be',
      'verify',
      '--dir',
      './backend/methods',
      '--json',
    ]);
  });

  it('normalizes singular dir option for package-level checks', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-check-singular-dir-'));
    createdDirs.push(rootDir);
    writeMethodFiles({
      rootDir,
      includeSpec: true,
      modulesDir: 'backend/methods',
    });

    const result = runBackendCheck({
      cwd: rootDir,
      dir: './backend/methods',
      format: 'json',
    });

    expect(result.ok).toBe(true);
    expect(result.nextAction.argv).toEqual([
      'rtgl',
      'be',
      'verify',
      '--dir',
      './backend/methods',
      '--json',
    ]);
  });
});
