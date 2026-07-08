import path from 'node:path';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runBackendVerify } from '../../src/cli/verify.js';
import {
  resolveAffectedMethods,
  runBackendResume,
} from '../../src/cli/agentWorkflow.js';
import { createBackendManifest } from '../../src/cli/manifest.js';

const writeProject = (rootDir, { modulesDir = 'src/modules' } = {}) => {
  const srcDir = path.join(rootDir, 'src');
  mkdirSync(srcDir, { recursive: true });
  writeFileSync(path.join(srcDir, 'setup.js'), [
    'export const setup = {',
    '  deps: { health: {} },',
    '};',
    '',
  ].join('\n'));
  writeFileSync(path.join(rootDir, 'vitest.config.js'), 'export default {};\n');

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
  writeFileSync(path.join(methodDir, 'ping.examples.yaml'), [
    'schemaVersion: rettangoli.examples/v1',
    "file: './ping.handlers.js'",
    'group: ping',
    '---',
    'suite: healthPingMethod',
    'exportName: healthPingMethod',
    '---',
    'case: ok',
    'proves:',
    '  result: success',
    'request:',
    "  jsonrpc: '2.0'",
    '  id: ok',
    '  method: health.ping',
    '  params: {}',
    'out:',
    "  jsonrpc: '2.0'",
    '  id: ok',
    '  result:',
    '    ok: true',
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

  it('returns check, build, manifest, app, db, and test results', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = await runBackendVerify({
      cwd: rootDir,
      runCommand,
    });

    expect(result.schemaVersion).toBe('rettangoli.cliResult/v1');
    expect(result.artifactSchemaVersion).toBe('rettangoli.verify/v1');
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
      { id: 'app', ok: true, skipped: false },
      { id: 'db', ok: true, skipped: false },
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
    expect(result.files.shared).toContain('src/setup.js');
    expect(result.nextAction.kind).toBe('done');
    expect(result.check.ok).toBe(true);
    expect(result.build.scope).toBe('project');
    expect(result.build.generated).toBe(false);
    expect(result.build.plan.schemaVersion).toBe('rettangoli.buildPlan/v1');
    expect(result.manifest.hash).toMatch(/^sha256:/);
    expect(result.app.artifactSchemaVersion).toBe('rettangoli.appCheck/v1');
    expect(result.db.artifactSchemaVersion).toBe('rettangoli.dbCheck/v1');
    expect(result.test.files).toEqual(['src/modules/health/ping/ping.examples.yaml']);
    expect(existsSync(path.join(rootDir, '.rtgl-be', 'generated', 'registry.js'))).toBe(false);
    expect(runCommand).toHaveBeenCalledOnce();
  });

  it('keeps method-scoped verify isolated from unrelated broken methods', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-scoped-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);
    writeBrokenMethod(rootDir);
    mkdirSync(path.join(rootDir, 'migrations'), { recursive: true });
    writeFileSync(path.join(rootDir, 'migrations', '001_bad.sql'), 'CREATE TABLE broken (\n');

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = await runBackendVerify({
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
    expect(result.steps.find((step) => step.id === 'db')).toEqual({
      id: 'db',
      ok: true,
      skipped: true,
    });
    expect(result.steps.find((step) => step.id === 'app')).toEqual({
      id: 'app',
      ok: true,
      skipped: true,
    });
    expect(result.app).toEqual(expect.objectContaining({
      ok: true,
      skipped: true,
      reason: 'method-scoped verify does not prove project runtime app instantiation',
    }));
    expect(result.db).toEqual(expect.objectContaining({
      ok: true,
      skipped: true,
      reason: 'method-scoped verify does not prove project-wide SQLite migrations',
    }));
    expect(result.nextAction).toEqual({
      kind: 'verify',
      message: 'Method verification passed. Run project verification before stopping.',
      argv: ['rtgl', 'be', 'verify', '--json'],
    });
    expect(result.manifest.methods).toEqual(['health.ping']);
    expect(result.test.files).toEqual(['src/modules/health/ping/ping.examples.yaml']);
  });

  it('keeps method-scoped verify isolated from setup module side effects', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-scoped-setup-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);
    writeFileSync(path.join(rootDir, 'src', 'setup.js'), [
      "if (!process.env.UNRELATED_SECRET) throw new Error('unrelated setup side effect');",
      'export const setup = { deps: { health: {} } };',
      '',
    ].join('\n'));

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = await runBackendVerify({
      cwd: rootDir,
      method: 'health.ping',
      env: {},
      runCommand,
    });

    expect(result.ok).toBe(true);
    expect(result.app.skipped).toBe(true);
    expect(result.nextAction.kind).toBe('verify');
  });

  it('validates global middleware during project verification', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-global-middleware-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);
    mkdirSync(path.join(rootDir, 'src', 'middleware'), { recursive: true });
    writeFileSync(path.join(rootDir, 'src', 'middleware', 'globalBefore.js'), 'export const globalBefore = () => "not middleware";\n');
    mkdirSync(path.join(rootDir, 'migrations'), { recursive: true });
    writeFileSync(path.join(rootDir, 'migrations', '001_bad.sql'), 'CREATE TABLE broken (\n');

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = await runBackendVerify({
      cwd: rootDir,
      globalMiddlewareBefore: ['globalBefore'],
      runCommand,
    });

    expect(result.ok).toBe(false);
    expect(result.failedPhase).toBe('app');
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-APP-011',
      filePath: 'src/middleware/globalBefore.js',
    }));
    expect(result.diagnostics.map((diagnostic) => diagnostic.ruleId)).toContain('RTGL-BE-DB-003');
    expect(result.nextAction).toEqual(expect.objectContaining({
      phase: 'app',
      files: ['src/middleware/globalBefore.js'],
    }));
  });

  it('preserves CLI overrides in verify rerun commands', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-overrides-'));
    createdDirs.push(rootDir);
    writeProject(rootDir, { modulesDir: 'backend/methods' });
    writeFileSync(path.join(rootDir, 'src', 'custom-setup.js'), 'export const setup = { deps: { health: {} } };\n');
    writeFileSync(path.join(rootDir, 'vitest.custom.js'), 'export default {};\n');

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = await runBackendVerify({
      cwd: rootDir,
      method: 'health.ping',
      dirs: ['./backend/methods'],
      middlewareDir: './src/custom-middleware',
      setup: './src/custom-setup.js',
      outdir: './custom-generated',
      migrationsDir: './database/sql',
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
      '--dir',
      './backend/methods',
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
      '--dir',
      './backend/methods',
      '--method',
      'health.ping',
      '--middleware-dir',
      './src/custom-middleware',
      '--setup-path',
      './src/custom-setup.js',
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
      '--dir',
      './backend/methods',
      '--method',
      'health.ping',
      '--middleware-dir',
      './src/custom-middleware',
      '--setup-path',
      './src/custom-setup.js',
      '--outdir',
      './custom-generated',
      '--migrations-dir',
      './database/sql',
      '--test-config',
      './vitest.custom.js',
      '--runner',
      'custom-runner',
      '--package-manager',
      'pnpm',
      '--json',
    ]);
    expect(result.commands.find((command) => command.id === 'app').argv).toEqual([
      'rtgl',
      'be',
      'app',
      'check',
      '--dir',
      './backend/methods',
      '--method',
      'health.ping',
      '--middleware-dir',
      './src/custom-middleware',
      '--setup-path',
      './src/custom-setup.js',
      '--json',
    ]);
  });

  it('points db verify failures at migration files and db rerun commands', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-db-fail-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);
    mkdirSync(path.join(rootDir, 'migrations'), { recursive: true });
    writeFileSync(path.join(rootDir, 'migrations', '001_ok.sql'), 'CREATE TABLE users (id TEXT PRIMARY KEY);\n');
    writeFileSync(path.join(rootDir, 'migrations', '002_bad.sql'), 'CREATE TABLE broken (\n');

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = await runBackendVerify({
      cwd: rootDir,
      runCommand,
    });

    expect(result.ok).toBe(false);
    expect(result.failedPhase).toBe('db');
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-DB-003',
      filePath: 'migrations/002_bad.sql',
    }));
    expect(result.files.owned).toContain('migrations/002_bad.sql');
    expect(result.nextAction).toEqual(expect.objectContaining({
      kind: 'fix',
      phase: 'db',
      target: 'database-migrations',
      argv: ['rtgl', 'be', 'db', 'check', '--json'],
    }));
  });

  it('can fail verify on destructive migration warnings', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-db-warnings-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);
    mkdirSync(path.join(rootDir, 'migrations'), { recursive: true });
    writeFileSync(path.join(rootDir, 'migrations', '001_drop_old.sql'), 'DROP TABLE old_users;\n');

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = await runBackendVerify({
      cwd: rootDir,
      failOnWarnings: true,
      runCommand,
      runDbReplay: () => ({
        ok: true,
        exitCode: 0,
        signal: null,
        timedOut: false,
        stdout: '',
        stderr: '',
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.failedPhase).toBe('db');
    expect(result.db.failOnWarnings).toBe(true);
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-DB-002',
      severity: 'warning',
      filePath: 'migrations/001_drop_old.sql',
    }));
    expect(result.nextAction.argv).toEqual([
      'rtgl',
      'be',
      'db',
      'check',
      '--fail-on-warnings',
      '--json',
    ]);
    expect(result.commands.find((command) => command.id === 'verify').argv).toEqual([
      'rtgl',
      'be',
      'verify',
      '--fail-on-warnings',
      '--json',
    ]);
  });

  it('returns agent-ready check failure details', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-check-fail-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);

    writeFileSync(path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml'), [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: ping',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '---',
      'case: ok',
      'request:',
      "  jsonrpc: '2.0'",
      '  id: ok',
      '  method: health.ping',
      '  params: {}',
      'out:',
      "  jsonrpc: '2.0'",
      '  id: ok',
      '  result:',
      '    ok: true',
      '',
    ].join('\n'));

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = await runBackendVerify({
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

  it('marks unrun evidence steps as skipped after early failures', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-evidence-skipped-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);
    writeFileSync(path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.examples.yaml'), [
      'schemaVersion: rettangoli.examples/v1',
      "file: './ping.handlers.js'",
      'group: ping',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '---',
      'case: ok',
      'request:',
      "  jsonrpc: '2.0'",
      '  id: ok',
      '  method: health.ping',
      '  params: {}',
      'out:',
      "  jsonrpc: '2.0'",
      '  id: ok',
      '  result:',
      '    ok: true',
      '',
    ].join('\n'));

    const result = await runBackendVerify({
      cwd: rootDir,
      evidence: 'task-contract-failure',
      runCommand: vi.fn(),
    });

    expect(result.ok).toBe(false);
    expect(result.doneCriteria).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'contracts-valid', status: 'failed' }),
      expect.objectContaining({ id: 'app-runtime-valid', status: 'skipped' }),
      expect.objectContaining({ id: 'sqlite-migrations-valid', status: 'skipped' }),
      expect.objectContaining({ id: 'examples-prove-contract', status: 'skipped' }),
    ]));
    const appJson = JSON.parse(readFileSync(path.join(rootDir, '.rtgl-be', 'evidence', 'task-contract-failure', 'app.json'), 'utf8'));
    expect(appJson).toEqual(expect.objectContaining({
      ok: true,
      skipped: true,
      name: 'app',
    }));

    writeFileSync(path.join(rootDir, 'src', 'setup.js'), 'export const setup = { deps: { health: { changed: true } } };\n');
    const resume = runBackendResume({
      cwd: rootDir,
      taskId: 'task-contract-failure',
    });
    expect(resume.ok).toBe(false);
    expect(resume.changedFiles).toContain('src/setup.js');
  });

  it('reports no examples without running Vitest', async () => {
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

    const result = await runBackendVerify({
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

  it('includes bounded test output when executable examples fail', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-test-fail-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);

    const runCommand = vi.fn(() => ({
      status: 1,
      stdout: 'stdout failure details',
      stderr: 'stderr failure details',
    }));

    const result = await runBackendVerify({
      cwd: rootDir,
      method: 'health.ping',
      env: {},
      runCommand,
    });

    expect(result.ok).toBe(false);
    expect(result.failedPhase).toBe('test');
    expect(result.test.exitCode).toBe(1);
    expect(result.test.command).toBe('test');
    expect(result.test.runner.argv[0]).toBe('npm');
    expect(result.diagnostics[0].ruleId).toBe('RTGL-BE-TEST-002');
    expect(result.diagnostics[0].outputTail).toEqual({
      stdout: 'stdout failure details',
      stderr: 'stderr failure details',
    });
  });

  it('writes verification evidence and resumes from a task anchor', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-evidence-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = await runBackendVerify({
      cwd: rootDir,
      evidence: 'task-health-ping',
      runCommand,
    });

    expect(result.ok).toBe(true);
    expect(result.commands.find((command) => command.id === 'verify').argv).toEqual([
      'rtgl',
      'be',
      'verify',
      '--evidence',
      'task-health-ping',
      '--json',
    ]);
    expect(result.nextAction.argv).toEqual([
      'rtgl',
      'be',
      'verify',
      '--evidence',
      'task-health-ping',
      '--json',
    ]);
    expect(result.evidence.schemaVersion).toBe('rettangoli.verifyEvidence/v1');
    expect(existsSync(path.join(rootDir, '.rtgl-be', 'evidence', 'task-health-ping', 'verify.json'))).toBe(true);
    expect(existsSync(path.join(rootDir, '.rtgl-be', 'tasks', 'task-health-ping.json'))).toBe(true);

    const resume = runBackendResume({
      cwd: rootDir,
      taskId: 'task-health-ping',
    });
    expect(resume.ok).toBe(true);
    expect(resume.nextAction.argv).toEqual([
      'rtgl',
      'be',
      'verify',
      '--evidence',
      'task-health-ping',
      '--json',
    ]);

    const verifyJson = JSON.parse(readFileSync(path.join(rootDir, '.rtgl-be', 'evidence', 'task-health-ping', 'verify.json'), 'utf8'));
    expect(verifyJson.doneCriteria.map((criterion) => criterion.id)).toContain('contracts-valid');
    expect(verifyJson.doneCriteria.map((criterion) => criterion.id)).toContain('app-runtime-valid');
    expect(verifyJson.doneCriteria.map((criterion) => criterion.id)).toContain('sqlite-migrations-valid');

    writeFileSync(path.join(rootDir, 'src', 'setup.js'), [
      'export const setup = {',
      '  deps: { health: { changed: true } },',
      '};',
      '',
    ].join('\n'));
    const changedResume = runBackendResume({
      cwd: rootDir,
      taskId: 'task-health-ping',
    });
    expect(changedResume.ok).toBe(false);
    expect(changedResume.changedFiles).toContain('src/setup.js');
    expect(changedResume.nextAction.argv).toEqual([
      'rtgl',
      'be',
      'verify',
      '--evidence',
      'task-health-ping',
      '--json',
    ]);
  });

  it('tracks migration files in verification task anchors', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-evidence-migrations-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);
    mkdirSync(path.join(rootDir, 'migrations'), { recursive: true });
    writeFileSync(path.join(rootDir, 'migrations', '001_create_users.sql'), 'CREATE TABLE users (id TEXT PRIMARY KEY);\n');

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = await runBackendVerify({
      cwd: rootDir,
      evidence: 'task-migrations',
      runCommand,
      runDbReplay: () => ({
        ok: true,
        exitCode: 0,
        signal: null,
        timedOut: false,
        stdout: '',
        stderr: '',
      }),
    });

    expect(result.ok).toBe(true);
    expect(result.files.shared).toContain('migrations/001_create_users.sql');

    writeFileSync(path.join(rootDir, 'migrations', '001_create_users.sql'), [
      'CREATE TABLE users (id TEXT PRIMARY KEY);',
      'CREATE INDEX users_id_idx ON users (id);',
      '',
    ].join('\n'));
    const resume = runBackendResume({
      cwd: rootDir,
      taskId: 'task-migrations',
    });
    expect(resume.ok).toBe(false);
    expect(resume.changedFiles).toContain('migrations/001_create_users.sql');
  });

  it('detects newly added source and migration files after evidence is written', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-verify-evidence-added-files-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);

    const runCommand = vi.fn(() => ({
      status: 0,
      stdout: '',
      stderr: '',
    }));

    const result = await runBackendVerify({
      cwd: rootDir,
      evidence: 'task-added-files',
      runCommand,
    });
    expect(result.ok).toBe(true);

    writeBrokenMethod(rootDir);
    mkdirSync(path.join(rootDir, 'migrations'), { recursive: true });
    writeFileSync(path.join(rootDir, 'migrations', '001_new.sql'), 'CREATE TABLE added (id TEXT PRIMARY KEY);\n');

    const resume = runBackendResume({
      cwd: rootDir,
      taskId: 'task-added-files',
    });

    expect(resume.ok).toBe(false);
    expect(resume.changedFiles).toContain('src/modules/user/broken/broken.contract.yaml');
    expect(resume.changedFiles).toContain('migrations/001_new.sql');
  });

  it('resolves affected methods from owned and shared manifest files', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-affected-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);

    const manifest = createBackendManifest({ cwd: rootDir });
    const affected = resolveAffectedMethods({
      manifest,
      filePaths: ['src/modules/health/ping/ping.contract.yaml'],
    });

    expect(affected.scope).toBe('method');
    expect(affected.methods).toEqual(['health.ping']);
  });
});
