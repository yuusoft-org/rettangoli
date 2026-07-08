import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createBackendManifest,
  stringifyStableJson,
} from '../../src/cli/manifest.js';

const writeProject = (rootDir) => {
  writeFileSync(path.join(rootDir, 'package.json'), JSON.stringify({
    name: 'manifest-app',
    version: '0.1.0',
    type: 'module',
  }, null, 2));

  const methodDir = path.join(rootDir, 'src', 'modules', 'user', 'getProfile');
  mkdirSync(methodDir, { recursive: true });

  writeFileSync(path.join(methodDir, 'getProfile.handlers.js'), [
    'export const userGetProfileMethod = async () => ({',
    "  id: 'u-1',",
    "  email: 'demo@example.com',",
    '});',
    '',
  ].join('\n'));

  writeFileSync(path.join(methodDir, 'getProfile.contract.yaml'), [
    'schemaVersion: rettangoli.contract/v1',
    'method: user.getProfile',
    'description: Get profile',
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
    '    id:',
    '      type: string',
    '    email:',
    '      type: string',
    '  required: [id, email]',
    'errors:',
    '  AUTH_REQUIRED:',
    '    description: Authentication is required.',
    '',
  ].join('\n'));

  writeFileSync(path.join(methodDir, 'getProfile.examples.yaml'), [
    'schemaVersion: rettangoli.examples/v1',
    "file: './getProfile.handlers.js'",
    'group: user-get-profile',
    '---',
    'suite: userGetProfileMethod',
    'exportName: userGetProfileMethod',
    '---',
    'case: returns-profile',
    'proves:',
    '  result: success',
    'request:',
    '  id: profile',
    '  params: {}',
    'out:',
    '  result:',
    '    id: u-1',
    '    email: demo@example.com',
    '---',
    'case: requires-auth',
    'proves:',
    '  error: AUTH_REQUIRED',
    'request:',
    '  id: auth',
    '  params: {}',
    'out:',
    '  error:',
    '    code: -32000',
    '    message: Domain error',
    '    data:',
    '      code: AUTH_REQUIRED',
    '',
  ].join('\n'));
};

describe('be manifest cli output', () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it('creates deterministic method manifest from contract packages', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-manifest-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);

    const manifest = createBackendManifest({ cwd: rootDir });

    expect(manifest.schemaVersion).toBe('rettangoli.manifest/v1');
    expect(manifest.app).toEqual({
      name: 'manifest-app',
      version: '0.1.0',
    });
    expect(Object.keys(manifest.methods)).toEqual(['user.getProfile']);
    expect(manifest.methods['user.getProfile'].domain).toBe('user');
    expect(manifest.protocol.request.mode).toBe('single');
    expect(manifest.generatedTargets.map((target) => target.kind)).toEqual(['registry', 'app']);
    expect(manifest.database).toEqual({
      schemaVersion: 'rettangoli.dbMigrations/v1',
      migrationsDir: './migrations',
      migrationCount: 0,
      migrations: [],
    });
    expect(manifest.methods['user.getProfile'].methodFolder).toBe('src/modules/user/getProfile');
    expect(manifest.methods['user.getProfile'].packageHash).toMatch(/^sha256:/);
    expect(manifest.methods['user.getProfile'].files).toEqual({
      owned: [
        'src/modules/user/getProfile/getProfile.contract.yaml',
        'src/modules/user/getProfile/getProfile.examples.yaml',
        'src/modules/user/getProfile/getProfile.handlers.js',
      ],
      shared: [],
    });
    expect(manifest.methods['user.getProfile'].setupDependencyPath).toBe('setup.deps.user');
    expect(manifest.methods['user.getProfile'].source).toEqual({
      contract: 'src/modules/user/getProfile/getProfile.contract.yaml',
      examples: 'src/modules/user/getProfile/getProfile.examples.yaml',
      handler: 'src/modules/user/getProfile/getProfile.handlers.js',
    });
    expect(manifest.methods['user.getProfile'].examples.success).toBe(1);
    expect(manifest.methods['user.getProfile'].examples.errors).toEqual({
      AUTH_REQUIRED: 1,
    });
    expect(manifest.methods['user.getProfile'].examples.cases).toEqual([
      {
        case: 'returns-profile',
        proves: {
          kind: 'result',
          target: 'success',
        },
      },
      {
        case: 'requires-auth',
        proves: {
          kind: 'error',
          target: 'AUTH_REQUIRED',
        },
      },
    ]);
    expect(manifest.methods['user.getProfile'].examples.coverage).toEqual({
      ok: true,
      success: {
        proved: true,
        count: 1,
      },
      errors: {
        declared: ['AUTH_REQUIRED'],
        proved: ['AUTH_REQUIRED'],
        missing: [],
      },
    });
    expect(manifest.methods['user.getProfile'].hashes.contract).toMatch(/^sha256:/);
    expect(stringifyStableJson(manifest)).toBe(stringifyStableJson(manifest));
  });

  it('keeps manifest deterministic when migrations are invalid SQL', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-manifest-db-'));
    createdDirs.push(rootDir);
    writeProject(rootDir);
    mkdirSync(path.join(rootDir, 'database'), { recursive: true });
    writeFileSync(path.join(rootDir, 'database', '001_bad.sql'), 'CREATE TABLE broken (\n');

    const manifest = createBackendManifest({
      cwd: rootDir,
      migrationsDir: './database',
      outdir: './generated/backend',
    });

    expect(manifest.generatedTargets).toEqual([
      {
        kind: 'registry',
        path: 'generated/backend/registry.js',
      },
      {
        kind: 'app',
        path: 'generated/backend/app.js',
      },
    ]);
    expect(manifest.database).toEqual({
      schemaVersion: 'rettangoli.dbMigrations/v1',
      migrationsDir: './database',
      migrationCount: 1,
      migrations: [
        {
          id: '001_bad',
          path: 'database/001_bad.sql',
          checksum: expect.stringMatching(/^sha256:/),
          destructive: false,
        },
      ],
    });
  });
});
