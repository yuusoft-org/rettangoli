import path from 'node:path';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { loadBeProjectConfig } from '../../src/runtime/loadBeProjectConfig.js';

describe('loadBeProjectConfig (cors)', () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it('loads cors config from rettangoli.config.yaml', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-cors-config-'));
    createdDirs.push(rootDir);

    writeFileSync(path.join(rootDir, 'rettangoli.config.yaml'), [
      'be:',
      '  cors:',
      '    allowedOrigins: ["http://localhost:3001"]',
      '    allowCredentials: true',
      '    allowMethods: ["POST", "OPTIONS"]',
      '    allowHeaders: ["Content-Type", "Authorization", "X-Refresh-Token"]',
      '    exposeHeaders: ["X-Request-Id"]',
      '    maxAgeSec: 3600',
      '',
    ].join('\n'));

    const config = loadBeProjectConfig({
      cwd: rootDir,
    });

    expect(config.cors).toEqual({
      allowedOrigins: ['http://localhost:3001'],
      allowCredentials: true,
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
      exposeHeaders: ['X-Request-Id'],
      maxAgeSec: 3600,
    });
  });

  it('throws for invalid cors.allowedOrigins', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-cors-invalid-'));
    createdDirs.push(rootDir);

    writeFileSync(path.join(rootDir, 'rettangoli.config.yaml'), [
      'be:',
      '  cors:',
      '    allowedOrigins: []',
      '',
    ].join('\n'));

    expect(() => loadBeProjectConfig({ cwd: rootDir })).toThrow(
      'loadBeProjectConfig: be.cors.allowedOrigins must be a non-empty array',
    );
  });
});
