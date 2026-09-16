import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
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
  it('loads configured remote data for each build and uses it in pages and the sitemap', async () => {
    await withTempDir(async (tempDir) => {
      writeFixtureSite(tempDir, { baseUrl: null, sitemapConfig: false });
      fs.writeFileSync(path.join(tempDir, 'sites.config.yaml'), [
        'imports:',
        '  data:',
        '    catalog: https://example.com/catalog.yaml',
        '    site: https://example.com/site.yaml'
      ].join('\n'));
      fs.writeFileSync(path.join(tempDir, 'pages', 'index.md'), '---\ntemplate: base\n---\nHome');
      fs.mkdirSync(path.join(tempDir, 'templates'));
      fs.writeFileSync(path.join(tempDir, 'templates', 'base.yaml'), '- h1: ${catalog.title}\n- "${content}"');
      let title = 'First';
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => ({
        ok: true,
        text: async () => url.endsWith('site.yaml') ? 'baseUrl: https://library.example' : `title: ${title}`
      }));
      try {
        await buildSite({ rootDir: tempDir, quiet: true });
        expect(fs.readFileSync(path.join(tempDir, '_site', 'index.html'), 'utf8')).toContain('First');
        title = 'Second';
        await buildSite({ rootDir: tempDir, quiet: true });
        expect(fs.readFileSync(path.join(tempDir, '_site', 'index.html'), 'utf8')).toContain('Second');
        expect(fs.readFileSync(path.join(tempDir, '_site', 'sitemap.xml'), 'utf8')).toContain('<loc>https://library.example/</loc>');
        expect(fetchMock).toHaveBeenCalledTimes(4);
      } finally {
        fetchMock.mockRestore();
      }
    });
  });

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
