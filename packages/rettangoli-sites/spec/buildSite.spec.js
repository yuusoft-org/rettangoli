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

function writeFixtureSite(rootDir, { baseUrl = 'https://example.com', sitemapConfig = true } = {}) {
  fs.mkdirSync(path.join(rootDir, 'pages'), { recursive: true });
  const configLines = [];
  if (baseUrl) {
    configLines.push('data:', '  site:', `    baseUrl: ${baseUrl}`);
  }
  if (sitemapConfig) {
    configLines.push('sitemap:', '  defaults:', '    changefreq: weekly');
  }
  if (configLines.length > 0) {
    fs.writeFileSync(path.join(rootDir, 'sites.config.yaml'), configLines.join('\n'));
  }
  fs.writeFileSync(path.join(rootDir, 'pages', 'index.md'), '# Home');
}

describe('buildSite', () => {
  it('generates a default sitemap when data.site.baseUrl is configured', async () => {
    await withTempDir(async (tempDir) => {
      writeFixtureSite(tempDir, { sitemapConfig: false });

      await buildSite({
        rootDir: tempDir,
        quiet: true
      });

      const sitemapXml = fs.readFileSync(path.join(tempDir, '_site', 'sitemap.xml'), 'utf8');
      expect(sitemapXml).toContain('<loc>https://example.com/</loc>');
    });
  });

  it('skips default sitemap output when no base URL is configured', async () => {
    await withTempDir(async (tempDir) => {
      writeFixtureSite(tempDir, { baseUrl: null, sitemapConfig: false });

      await buildSite({
        rootDir: tempDir,
        quiet: true
      });

      expect(fs.existsSync(path.join(tempDir, '_site', 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '_site', 'sitemap.xml'))).toBe(false);
    });
  });

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
