import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { runBackendDbCheck } from '../../src/cli/db.js';

const replayOk = () => ({
  status: 0,
  stdout: '',
  stderr: '',
  signal: null,
});

const replaySqlError = (message = 'Parse error: incomplete input') => () => ({
  status: 1,
  stdout: '',
  stderr: message,
  signal: null,
});

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

    const result = runBackendDbCheck({
      cwd: rootDir,
      replayCommand: replayOk,
    });

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
      file: { path: 'migrations/nested/001_init.sql' },
      filePath: 'migrations/nested/001_init.sql',
      migrationId: '001_init',
      fix: 'Rename duplicate migration files so every migration id is unique.',
      rerun: expect.objectContaining({
        id: 'db',
        argv: ['rtgl', 'be', 'db', 'check', '--json'],
      }),
    }));
    expect(result.nextAction).toEqual(expect.objectContaining({
      phase: 'db',
      target: 'database-migrations',
      files: ['migrations/nested/001_init.sql'],
      argv: ['rtgl', 'be', 'db', 'check', '--json'],
    }));
    expect(result.replay).toEqual(expect.objectContaining({
      ok: false,
      skipped: true,
      reason: 'blocked by migration diagnostics',
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
      replayCommand: replaySqlError('Parse error near line 3: incomplete input'),
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
    expect(result.diagnostics[0].message).not.toContain('spawnSync sqlite3 EPERM');
  });

  it('points replay failures at the failing migration file', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-db-bad-second-'));
    createdDirs.push(rootDir);
    mkdirSync(path.join(rootDir, 'migrations'), { recursive: true });
    writeFileSync(path.join(rootDir, 'migrations', '001_ok.sql'), 'CREATE TABLE users (id TEXT PRIMARY KEY);\n');
    writeFileSync(path.join(rootDir, 'migrations', '002_bad.sql'), 'CREATE TABLE broken (\n');

    let replayCount = 0;
    const result = runBackendDbCheck({
      cwd: rootDir,
      replayCommand: () => {
        replayCount += 1;
        return replayCount === 1
          ? replayOk()
          : replaySqlError('Parse error near line 3: incomplete input')();
      },
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-DB-003',
      filePath: 'migrations/002_bad.sql',
      migrationId: '002_bad',
    }));
    expect(result.diagnostics[0].message).not.toContain('spawnSync sqlite3 EPERM');
  });

  it('fails replay when sqlite spawn reports an error with status zero', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-db-spawn-error-status-zero-'));
    createdDirs.push(rootDir);
    mkdirSync(path.join(rootDir, 'migrations'), { recursive: true });
    writeFileSync(path.join(rootDir, 'migrations', '001_ok.sql'), 'CREATE TABLE users (id TEXT PRIMARY KEY);\n');

    const result = runBackendDbCheck({
      cwd: rootDir,
      replayCommand: () => ({
        status: 0,
        stdout: '',
        stderr: '',
        signal: null,
        error: Object.assign(new Error('spawnSync sqlite3 EPERM'), {
          code: 'EPERM',
        }),
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.replay).toEqual(expect.objectContaining({
      ok: false,
      exitCode: 1,
      timedOut: false,
    }));
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-DB-003',
      filePath: 'migrations/001_ok.sql',
      migrationId: '001_ok',
    }));
    expect(result.diagnostics[0].message).toContain('spawnSync sqlite3 EPERM');
    expect(result.nextAction).toEqual(expect.objectContaining({
      phase: 'db',
      target: 'database-migrations',
      argv: ['rtgl', 'be', 'db', 'check', '--json'],
    }));
  });

  it('reports destructive migration warnings and can fail on warnings', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-db-warning-'));
    createdDirs.push(rootDir);
    mkdirSync(path.join(rootDir, 'migrations'), { recursive: true });
    writeFileSync(path.join(rootDir, 'migrations', '001_drop.sql'), [
      'CREATE TABLE old_users (id TEXT PRIMARY KEY);',
      'DROP TABLE old_users;',
      '',
    ].join('\n'));

    const defaultResult = runBackendDbCheck({
      cwd: rootDir,
      replayCommand: replayOk,
    });
    const strictResult = runBackendDbCheck({
      cwd: rootDir,
      failOnWarnings: true,
      replayCommand: replayOk,
    });

    expect(defaultResult.ok).toBe(true);
    expect(defaultResult.warningCount).toBe(1);
    expect(defaultResult.errorCount).toBe(0);
    expect(defaultResult.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-DB-002',
      severity: 'warning',
      file: { path: 'migrations/001_drop.sql' },
      fix: 'Review the destructive migration statement and make the migration policy explicit.',
    }));
    expect(strictResult.ok).toBe(false);
    expect(strictResult.failOnWarnings).toBe(true);
    expect(strictResult.nextAction).toEqual(expect.objectContaining({
      phase: 'db',
      target: 'database-migrations',
      files: ['migrations/001_drop.sql'],
      argv: ['rtgl', 'be', 'db', 'check', '--fail-on-warnings', '--json'],
    }));
  });

  it('loads configured migrations dir for package-level db checks', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-db-config-dir-'));
    createdDirs.push(rootDir);
    mkdirSync(path.join(rootDir, 'database', 'sql'), { recursive: true });
    writeFileSync(path.join(rootDir, 'rettangoli.config.yaml'), [
      'be:',
      '  migrationsDir: ./database/sql',
      '',
    ].join('\n'));
    writeFileSync(path.join(rootDir, 'database', 'sql', '001_init.sql'), 'CREATE TABLE users (id TEXT PRIMARY KEY);\n');

    const result = runBackendDbCheck({
      cwd: rootDir,
      runReplay: () => ({
        ok: true,
        exitCode: 0,
        signal: null,
        timedOut: false,
        stdout: '',
        stderr: '',
      }),
    });

    expect(result.ok).toBe(true);
    expect(result.migrationsDir).toBe('./database/sql');
    expect(result.migrations.map((migration) => migration.path)).toEqual([
      'database/sql/001_init.sql',
    ]);
    expect(result.commands.find((command) => command.id === 'db').argv).toEqual([
      'rtgl',
      'be',
      'db',
      'check',
      '--migrations-dir',
      './database/sql',
      '--json',
    ]);
  });
});
