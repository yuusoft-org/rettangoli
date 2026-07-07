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
    "file: './getProfile.handlers.js'",
    'group: user-get-profile',
    '---',
    'suite: userGetProfileMethod',
    'exportName: userGetProfileMethod',
    '---',
    'case: returns-profile',
    'proves:',
    '  result: success',
    'in:',
    '  - payload: {}',
    'out:',
    '  id: u-1',
    '  email: demo@example.com',
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
    expect(manifest.methods['user.getProfile'].source).toEqual({
      contract: 'src/modules/user/getProfile/getProfile.contract.yaml',
      examples: 'src/modules/user/getProfile/getProfile.examples.yaml',
      handler: 'src/modules/user/getProfile/getProfile.handlers.js',
    });
    expect(manifest.methods['user.getProfile'].examples).toEqual({
      success: 1,
      errors: {
        AUTH_REQUIRED: 1,
      },
    });
    expect(manifest.methods['user.getProfile'].hashes.contract).toMatch(/^sha256:/);
    expect(stringifyStableJson(manifest)).toBe(stringifyStableJson(manifest));
  });
});
