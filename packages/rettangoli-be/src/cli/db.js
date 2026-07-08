import path from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { getAllFiles } from '../commonBuild.js';
import { stringifyStableJson } from './json.js';
import { createCliResult } from './results.js';

const toPosixRelativePath = (cwd, filePath) => {
  return path.relative(cwd, filePath).replaceAll(path.sep, '/');
};

const hashContent = (content) => {
  const hash = createHash('sha256');
  hash.update(content);
  return `sha256:${hash.digest('hex')}`;
};

const createDiagnostic = ({
  ruleId,
  phase = 'db',
  severity = 'error',
  filePath,
  migrationId,
  message,
}) => ({
  schemaVersion: 'rettangoli.diagnostic/v1',
  ruleId,
  code: ruleId,
  severity,
  phase,
  filePath,
  migrationId,
  message,
});

const migrationIdFromPath = (filePath) => path.basename(filePath, '.sql');

const findMigrations = ({ cwd, migrationsDir }) => {
  const resolvedDir = path.resolve(cwd, migrationsDir);
  if (!existsSync(resolvedDir)) {
    return [];
  }

  return getAllFiles([resolvedDir])
    .filter((filePath) => filePath.endsWith('.sql'))
    .map((filePath) => {
      const content = readFileSync(filePath, 'utf8');
      return {
        id: migrationIdFromPath(filePath),
        path: toPosixRelativePath(cwd, filePath),
        absolutePath: filePath,
        checksum: hashContent(content),
        destructive: /\b(drop\s+table|drop\s+column|truncate|delete\s+from)\b/i.test(content),
        content,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id) || a.path.localeCompare(b.path));
};

const SQLITE_REPLAY_TIMEOUT_MS = 3000;

const stripMigrationContent = ({ content, absolutePath, ...migration }) => migration;

export const collectBackendMigrationFacts = ({
  cwd = process.cwd(),
  migrationsDir = './migrations',
} = {}) => {
  const migrations = findMigrations({ cwd, migrationsDir });

  return {
    schemaVersion: 'rettangoli.dbMigrations/v1',
    migrationsDir,
    migrationCount: migrations.length,
    migrations: migrations.map(stripMigrationContent),
  };
};

const quoteSqliteDotPath = (filePath) => `"${filePath.replaceAll('"', '""')}"`;

const replayMigrations = ({ migrations, sqliteExecutable, timeoutMs = SQLITE_REPLAY_TIMEOUT_MS }) => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-db-'));
  const dbPath = path.join(tempDir, 'check.sqlite');
  const stdoutParts = [];
  const stderrParts = [];

  try {
    for (const migration of migrations) {
      const replayPath = path.join(tempDir, `${migration.id}.sql`);
      const replaySql = `${[
        'PRAGMA foreign_keys = ON;',
        `-- ${migration.id}`,
        migration.content,
      ].join('\n')}\n`;
      writeFileSync(replayPath, replaySql);

      const input = `.read ${quoteSqliteDotPath(replayPath)}\n.quit\n`;
      const result = spawnSync(sqliteExecutable, ['-batch', dbPath], {
        input,
        encoding: 'utf8',
        timeout: timeoutMs,
      });
      const stderr = [
        result.error?.message,
        result.stderr,
      ].filter(Boolean).join('\n');

      if (result.stdout) {
        stdoutParts.push(result.stdout);
      }
      if (stderr) {
        stderrParts.push(stderr);
      }

      if (result.status !== 0) {
        return {
          ok: false,
          exitCode: result.status,
          signal: result.signal,
          timedOut: result.error?.code === 'ETIMEDOUT',
          stdout: stdoutParts.join('\n'),
          stderr,
          migrationId: migration.id,
          migrationPath: migration.path,
        };
      }
    }

    return {
      ok: true,
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: stdoutParts.join('\n'),
      stderr: stderrParts.join('\n'),
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
};

export const runBackendDbCheck = (options = {}) => {
  const {
    cwd = process.cwd(),
    migrationsDir = './migrations',
    sqliteExecutable = 'sqlite3',
    replayTimeoutMs = SQLITE_REPLAY_TIMEOUT_MS,
    failOnWarnings = false,
    runReplay = replayMigrations,
  } = options;
  const migrations = findMigrations({ cwd, migrationsDir });
  const diagnostics = [];
  const seenIds = new Map();

  migrations.forEach((migration) => {
    if (seenIds.has(migration.id)) {
      diagnostics.push(createDiagnostic({
        ruleId: 'RTGL-BE-DB-001',
        filePath: migration.path,
        migrationId: migration.id,
        message: `Duplicate migration id '${migration.id}'.`,
      }));
    } else {
      seenIds.set(migration.id, migration.path);
    }

    if (migration.destructive) {
      diagnostics.push(createDiagnostic({
        ruleId: 'RTGL-BE-DB-002',
        severity: 'warning',
        filePath: migration.path,
        migrationId: migration.id,
        message: `Migration '${migration.id}' contains a potentially destructive statement.`,
      }));
    }
  });

  let replay = {
    ok: migrations.length === 0,
    skipped: migrations.length === 0,
    reason: migrations.length === 0 ? 'no migrations' : undefined,
  };

  const hasBlockingDiagnostics = diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  if (migrations.length > 0 && hasBlockingDiagnostics) {
    replay = {
      ok: false,
      skipped: true,
      reason: 'blocked by migration diagnostics',
    };
  } else if (migrations.length > 0) {
    replay = runReplay({ migrations, sqliteExecutable, timeoutMs: replayTimeoutMs });
    if (!replay.ok) {
      const detail = String(replay.stderr || replay.stdout || '').trim()
        || `sqlite3 exited with ${replay.exitCode ?? replay.signal ?? 'unknown status'}.`;
      diagnostics.push(createDiagnostic({
        ruleId: 'RTGL-BE-DB-003',
        filePath: replay.migrationPath ?? migrations[0]?.path,
        migrationId: replay.migrationId ?? migrations[0]?.id,
        message: `SQLite migration replay failed: ${detail}`,
      }));
    }
  }

  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length;

  return createCliResult({
    command: 'db check',
    artifactSchemaVersion: 'rettangoli.dbCheck/v1',
    ok: errorCount === 0 && (!failOnWarnings || warningCount === 0),
    migrationsDir,
    migrationCount: migrations.length,
    errorCount,
    warningCount,
    failOnWarnings,
    migrations: migrations.map(stripMigrationContent),
    replay: {
      ok: replay.ok,
      skipped: replay.skipped === true,
      exitCode: replay.exitCode,
      signal: replay.signal,
      timedOut: replay.timedOut === true,
      reason: replay.reason,
    },
    diagnostics,
  });
};

const dbRettangoliBackend = (options = {}) => {
  const result = runBackendDbCheck(options);
  const outputFormat = options.format === 'json' || options.json ? 'json' : 'text';

  if (outputFormat === 'json') {
    process.stdout.write(stringifyStableJson(result));
  } else if (result.ok) {
    console.log(`[DB] SQLite migrations passed: ${result.migrationCount}`);
  } else {
    console.error(`[DB] SQLite migrations failed: ${result.diagnostics.length} issue(s)`);
  }

  if (!result.ok) {
    process.exitCode = 1;
  }

  return result;
};

export default dbRettangoliBackend;
