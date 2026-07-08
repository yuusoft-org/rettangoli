import path from 'node:path';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  applyMethodScaffoldPlan,
  createMethodScaffoldPlan,
} from '../../src/cli/scaffold.js';
import { runBackendCheck } from '../../src/cli/check.js';

describe('be scaffold command', () => {
  const createdDirs = [];

  afterEach(() => {
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
    expect(existsSync(path.join(rootDir, 'src', 'modules', 'user', 'getProfile'))).toBe(false);

    applyMethodScaffoldPlan(plan);

    expect(existsSync(path.join(rootDir, 'src', 'modules', 'user', 'getProfile', 'getProfile.contract.yaml'))).toBe(true);
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
});
