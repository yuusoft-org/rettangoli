import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { runBackendDbCheck } from '../../src/cli/db.js';

describe('be db check command', () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it('checks ordered SQLite migrations with checksums and replay', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-db-'));
    createdDirs.push(rootDir);
    const migrationsDir = path.join(rootDir, 'migrations');
    mkdirSync(migrationsDir, { recursive: true });
    writeFileSync(path.join(migrationsDir, '001_create_users.sql'), [
      'CREATE TABLE users (',
      '  id TEXT PRIMARY KEY,',
      '  email TEXT NOT NULL UNIQUE',
      ');',
      '',
    ].join('\n'));
    writeFileSync(path.join(migrationsDir, '002_create_posts.sql'), [
      'CREATE TABLE posts (',
      '  id TEXT PRIMARY KEY,',
      '  user_id TEXT NOT NULL REFERENCES users(id)',
      ');',
      '',
    ].join('\n'));

    const result = runBackendDbCheck({ cwd: rootDir });

    expect(result.schemaVersion).toBe('rettangoli.cliResult/v1');
    expect(result.artifactSchemaVersion).toBe('rettangoli.dbCheck/v1');
    expect(result.ok).toBe(true);
    expect(result.migrationCount).toBe(2);
    expect(result.migrations[0].checksum).toMatch(/^sha256:/);
    expect(result.replay.ok).toBe(true);
  });

  it('reports duplicate migration ids', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-db-dup-'));
    createdDirs.push(rootDir);
    mkdirSync(path.join(rootDir, 'migrations', 'nested'), { recursive: true });
    writeFileSync(path.join(rootDir, 'migrations', '001_init.sql'), 'CREATE TABLE a (id TEXT);\n');
    writeFileSync(path.join(rootDir, 'migrations', 'nested', '001_init.sql'), 'CREATE TABLE b (id TEXT);\n');

    const result = runBackendDbCheck({ cwd: rootDir });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-DB-001',
      migrationId: '001_init',
    }));
  });

  it('reports incomplete SQL replay failures without timing out', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-db-bad-sql-'));
    createdDirs.push(rootDir);
    mkdirSync(path.join(rootDir, 'migrations'), { recursive: true });
    writeFileSync(path.join(rootDir, 'migrations', '001_bad.sql'), 'CREATE TABLE broken (\n');

    const startedAt = Date.now();
    const result = runBackendDbCheck({
      cwd: rootDir,
      replayTimeoutMs: 1000,
    });
    const elapsedMs = Date.now() - startedAt;

    expect(elapsedMs).toBeLessThan(1000);
    expect(result.ok).toBe(false);
    expect(result.replay.timedOut).toBe(false);
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-DB-003',
      migrationId: '001_bad',
    }));
    expect(result.diagnostics[0].message).toMatch(/incomplete input/i);
  });
});
