import path from 'node:path';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyBackendInitPlan,
  createBackendInitPlan,
  default as initRettangoliBackend,
} from '../../src/cli/init.js';
import { runBackendVerify } from '../../src/cli/verify.js';

describe('be init command', () => {
  const createdDirs = [];

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
    createdDirs.forEach((dirPath) => rmSync(dirPath, { recursive: true, force: true }));
    createdDirs.length = 0;
  });

  it('creates a dry-run project init plan without writing files', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-init-plan-'));
    createdDirs.push(rootDir);

    const plan = createBackendInitPlan({ cwd: rootDir });

    expect(plan.schemaVersion).toBe('rettangoli.initPlan/v1');
    expect(plan.ok).toBe(true);
    expect(plan.targets.map((target) => target.path)).toEqual([
      'package.json',
      'rettangoli.config.yaml',
      'vitest.config.js',
      'src/setup.js',
      'migrations/.gitkeep',
      'src/modules/health/ping/ping.contract.yaml',
      'src/modules/health/ping/ping.examples.yaml',
      'src/modules/health/ping/ping.handlers.js',
    ]);
    expect(plan.targets.every((target) => target.hash.startsWith('sha256:'))).toBe(true);
    expect(plan.verify.argv).toEqual(['rtgl', 'be', 'verify', '--json']);
    expect(existsSync(path.join(rootDir, 'src', 'setup.js'))).toBe(false);
  });

  it('applies the project init plan and verifies the initialized app', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-init-apply-'));
    createdDirs.push(rootDir);
    const plan = createBackendInitPlan({ cwd: rootDir });

    applyBackendInitPlan(plan);

    expect(existsSync(path.join(rootDir, 'rettangoli.config.yaml'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'src', 'modules', 'health', 'ping', 'ping.contract.yaml'))).toBe(true);

    const result = await runBackendVerify({
      cwd: rootDir,
      runCommand: vi.fn(() => ({
        status: 0,
        stdout: '',
        stderr: '',
      })),
    });

    expect(result.ok).toBe(true);
    expect(result.app.ok).toBe(true);
  });

  it('returns JSON diagnostics for invalid init input', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-init-invalid-'));
    createdDirs.push(rootDir);
    let output = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });

    const result = initRettangoliBackend({
      cwd: rootDir,
      method: '../bad',
      dryRun: true,
      format: 'json',
    });
    const parsed = JSON.parse(output);

    expect(result.ok).toBe(false);
    expect(parsed.ok).toBe(false);
    expect(parsed.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-INIT-001',
      phase: 'init',
    }));
    expect(process.exitCode).toBe(1);
  });

  it('reports init conflicts in text output', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-init-conflict-'));
    createdDirs.push(rootDir);
    writeFileSync(path.join(rootDir, 'package.json'), '{}\n');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = initRettangoliBackend({
      cwd: rootDir,
    });

    expect(result.ok).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('[Init] Backend app init failed: 1 conflict(s).');
    expect(logSpy).not.toHaveBeenCalledWith('[Init] Created backend app.');
    expect(process.exitCode).toBe(1);
  });
});
