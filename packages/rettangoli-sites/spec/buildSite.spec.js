import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSite } from '../src/cli/build.js';

async function withTempDir(fn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rtgl-sites-build-'));
  try {
    return await fn(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function writeFixtureSite(rootDir) {
  fs.mkdirSync(path.join(rootDir, 'pages'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'sites.config.yaml'),
    [
      'data:',
      '  site:',
      '    baseUrl: https://example.com',
      'sitemap:',
      '  defaults:',
      '    changefreq: weekly'
    ].join('\n')
  );
  fs.writeFileSync(path.join(rootDir, 'pages', 'index.md'), '# Home');
}

describe('buildSite', () => {
  it('falls back to configured sitemap when options.sitemap is undefined', async () => {
    await withTempDir(async (tempDir) => {
      writeFixtureSite(tempDir);

      await buildSite({
        rootDir: tempDir,
        sitemap: undefined,
        quiet: true
      });

      const sitemapXml = fs.readFileSync(path.join(tempDir, '_site', 'sitemap.xml'), 'utf8');
      expect(sitemapXml).toContain('<loc>https://example.com/</loc>');
      expect(sitemapXml).toContain('<changefreq>weekly</changefreq>');
    });
  });

  it('lets options.sitemap false disable configured sitemap output', async () => {
    await withTempDir(async (tempDir) => {
      writeFixtureSite(tempDir);

      await buildSite({
        rootDir: tempDir,
        sitemap: false,
        quiet: true
      });

      expect(fs.existsSync(path.join(tempDir, '_site', 'sitemap.xml'))).toBe(false);
    });
  });
});
