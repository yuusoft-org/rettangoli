import path from 'node:path';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyMethodScaffoldPlan,
  createMethodScaffoldPlan,
  default as scaffold,
} from '../../src/cli/scaffold.js';
import { runBackendCheck } from '../../src/cli/check.js';

describe('be scaffold command', () => {
  const createdDirs = [];

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it('creates a dry-run method scaffold plan and applies it', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-scaffold-'));
    createdDirs.push(rootDir);

    const plan = createMethodScaffoldPlan({
      cwd: rootDir,
      methodId: 'user.getProfile',
    });

    expect(plan.schemaVersion).toBe('rettangoli.scaffoldPlan/v1');
    expect(plan.ok).toBe(true);
    expect(plan.methodFolder).toBe('src/modules/user/getProfile');
    expect(plan.targets.map((target) => target.path)).toEqual([
      'src/modules/user/getProfile/getProfile.contract.yaml',
      'src/modules/user/getProfile/getProfile.examples.yaml',
      'src/modules/user/getProfile/getProfile.handlers.js',
    ]);
    expect(plan.targets[0].hash).toMatch(/^sha256:/);
    expect(plan.setupRequirement).toEqual({
      path: 'src/setup.js',
      dependencyPath: 'setup.deps.user',
      message: 'Ensure setup.deps.user exists before importing the generated app.',
    });
    expect(existsSync(path.join(rootDir, 'src', 'modules', 'user', 'getProfile'))).toBe(false);

    applyMethodScaffoldPlan(plan);

    expect(existsSync(path.join(rootDir, 'src', 'modules', 'user', 'getProfile', 'getProfile.contract.yaml'))).toBe(true);
    expect(readFileSync(path.join(rootDir, 'src', 'modules', 'user', 'getProfile', 'getProfile.handlers.js'), 'utf8')).toContain(
      'export const userGetProfileMethod = () =>',
    );
    const examples = readFileSync(path.join(rootDir, 'src', 'modules', 'user', 'getProfile', 'getProfile.examples.yaml'), 'utf8');
    expect(examples).toContain('request:\n  id: ok\n  params: {}');
    expect(examples).not.toContain('jsonrpc');
    expect(examples).not.toContain('method: user.getProfile');
    const check = runBackendCheck({
      cwd: rootDir,
      method: 'user.getProfile',
    });
    expect(check.ok).toBe(true);
  });

  it('reports conflicts instead of overwriting files', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-scaffold-conflict-'));
    createdDirs.push(rootDir);
    const plan = createMethodScaffoldPlan({
      cwd: rootDir,
      methodId: 'health.ping',
    });
    applyMethodScaffoldPlan(plan);

    const secondPlan = createMethodScaffoldPlan({
      cwd: rootDir,
      methodId: 'health.ping',
    });

    expect(secondPlan.ok).toBe(false);
    expect(secondPlan.conflicts).toContain('src/modules/health/ping/ping.contract.yaml');
  });

  it('reports conflicts in text output without claiming success', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-scaffold-conflict-text-'));
    createdDirs.push(rootDir);
    const plan = createMethodScaffoldPlan({
      cwd: rootDir,
      methodId: 'health.ping',
    });
    applyMethodScaffoldPlan(plan);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = scaffold({
      cwd: rootDir,
      method: 'health.ping',
    });

    expect(result.ok).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('[Scaffold] Failed to create method package for health.ping: 3 conflict(s).');
    expect(logSpy).not.toHaveBeenCalledWith('[Scaffold] Created method package for health.ping.');
    expect(process.exitCode).toBe(1);
  });

  it('returns structured JSON diagnostics for invalid scaffold input', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-scaffold-invalid-json-'));
    createdDirs.push(rootDir);
    let output = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });

    const result = scaffold({
      cwd: rootDir,
      method: '../bad',
      dryRun: true,
      format: 'json',
    });
    const parsed = JSON.parse(output);

    expect(result.ok).toBe(false);
    expect(parsed.ok).toBe(false);
    expect(parsed.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-SCAFFOLD-001',
      phase: 'scaffold',
    }));
    expect(parsed.diagnostics[0].message).toContain('Method id must use');
    expect(process.exitCode).toBe(1);
  });

  it('rejects unsafe method id path segments', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-scaffold-unsafe-'));
    createdDirs.push(rootDir);

    expect(() => createMethodScaffoldPlan({
      cwd: rootDir,
      methodId: '../user.getProfile',
    })).toThrow(/must use|invalid/i);

    expect(() => createMethodScaffoldPlan({
      cwd: rootDir,
      methodId: 'user.get/Profile',
    })).toThrow(/invalid/i);
  });

  it('accepts one configured dirs entry and preserves it in verify argv', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-scaffold-custom-dir-'));
    createdDirs.push(rootDir);

    const plan = createMethodScaffoldPlan({
      cwd: rootDir,
      methodId: 'billing.createInvoice',
      dirs: ['./backend/methods'],
    });

    expect(plan.methodFolder).toBe('backend/methods/billing/createInvoice');
    expect(plan.verify.argv).toEqual([
      'rtgl',
      'be',
      'verify',
      '--dir',
      './backend/methods',
      '--method',
      'billing.createInvoice',
      '--json',
    ]);

    expect(() => createMethodScaffoldPlan({
      cwd: rootDir,
      methodId: 'billing.createInvoice',
      dirs: ['./backend/methods', './other'],
    })).toThrow(/exactly one method directory/);
  });
});
