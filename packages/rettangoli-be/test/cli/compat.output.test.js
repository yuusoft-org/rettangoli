import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import compatRettangoliBackend, { runBackendCompat } from '../../src/cli/compat.js';

const methodEntry = (overrides = {}) => ({
  source: {
    contract: 'src/modules/health/ping/ping.contract.yaml',
  },
  params: {
    type: 'object',
    additionalProperties: false,
    properties: {},
    required: [],
  },
  result: {
    type: 'object',
    additionalProperties: false,
    properties: {
      ok: { type: 'boolean' },
    },
    required: ['ok'],
  },
  errors: {},
  middleware: {
    before: [],
    after: [],
  },
  ...overrides,
});

const manifest = (methods) => ({
  schemaVersion: 'rettangoli.manifest/v1',
  methods,
});

describe('be compat command', () => {
  const createdDirs = [];

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
    createdDirs.forEach((dirPath) => rmSync(dirPath, { recursive: true, force: true }));
    createdDirs.length = 0;
  });

  it('reports added methods as compatible safe changes', () => {
    const result = runBackendCompat({
      fromManifest: manifest({}),
      toManifest: manifest({
        'health.ping': methodEntry(),
      }),
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('compatible');
    expect(result.summary).toEqual({
      methodsCompared: 1,
      changes: 1,
      breaking: 0,
      risky: 0,
      safe: 1,
    });
    expect(result.changes[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-COMPAT-001',
      severity: 'safe',
      method: 'health.ping',
    }));
  });

  it('reports removed methods and params changes as breaking', () => {
    const result = runBackendCompat({
      fromManifest: manifest({
        'health.ping': methodEntry(),
        'user.getProfile': methodEntry({
          source: { contract: 'src/modules/user/getProfile/getProfile.contract.yaml' },
        }),
      }),
      toManifest: manifest({
        'health.ping': methodEntry({
          params: {
            type: 'object',
            additionalProperties: false,
            properties: {
              echo: { type: 'string' },
            },
            required: ['echo'],
          },
        }),
      }),
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('incompatible');
    expect(result.changes.map((change) => change.ruleId)).toEqual([
      'RTGL-BE-COMPAT-003',
      'RTGL-BE-COMPAT-002',
    ]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.ruleId)).toEqual([
      'RTGL-BE-COMPAT-003',
      'RTGL-BE-COMPAT-002',
    ]);
  });

  it('reports result changes as risky but compatible', () => {
    const result = runBackendCompat({
      fromManifest: manifest({
        'health.ping': methodEntry(),
      }),
      toManifest: manifest({
        'health.ping': methodEntry({
          result: {
            type: 'object',
            additionalProperties: false,
            properties: {
              ok: { type: 'boolean' },
              ts: { type: 'number' },
            },
            required: ['ok', 'ts'],
          },
        }),
      }),
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('compatible');
    expect(result.changes[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-COMPAT-004',
      severity: 'risky',
    }));
  });

  it('returns JSON diagnostics for unreadable manifests', () => {
    let output = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });

    const result = compatRettangoliBackend({
      from: './missing-before.json',
      to: './missing-after.json',
      format: 'json',
    });
    const parsed = JSON.parse(output);

    expect(result.ok).toBe(false);
    expect(parsed.ok).toBe(false);
    expect(parsed.status).toBe('error');
    expect(parsed.diagnostics[0]).toEqual(expect.objectContaining({
      ruleId: 'RTGL-BE-COMPAT-009',
      phase: 'compat',
      message: 'Manifest file not found.',
    }));
    expect(parsed.diagnostics[0].message).not.toContain(process.cwd());
    expect(process.exitCode).toBe(1);
  });

  it('sanitizes filesystem read errors in JSON diagnostics', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-compat-enotdir-'));
    createdDirs.push(rootDir);
    writeFileSync(path.join(rootDir, 'not-a-dir'), 'not json\n');
    let output = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });

    const result = compatRettangoliBackend({
      cwd: rootDir,
      from: './not-a-dir/manifest.json',
      to: './not-a-dir/manifest.json',
      format: 'json',
    });
    const parsed = JSON.parse(output);

    expect(result.ok).toBe(false);
    expect(parsed.diagnostics[0].message).toBe('Manifest file could not be read: ENOTDIR.');
    expect(parsed.diagnostics[0].message).not.toContain(rootDir);
  });
});
