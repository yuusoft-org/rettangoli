import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSite } from '../src/cli/build.js';
import { buildRssFeeds, normalizeRssConfig } from '../src/rss.js';

async function withTempDir(fn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rtgl-sites-rss-'));
  try {
    return await fn(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function writeRssSite(rootDir, { rssYaml, pages = {}, dataSite = {}, template } = {}) {
  fs.mkdirSync(path.join(rootDir, 'pages'), { recursive: true });

  const configLines = [];
  if (Object.keys(dataSite).length > 0) {
    configLines.push('data:', '  site:');
    for (const [key, value] of Object.entries(dataSite)) {
      configLines.push(`    ${key}: ${value}`);
    }
  }
  if (rssYaml !== undefined) {
    configLines.push(...rssYaml.split('\n'));
  }
  if (configLines.length > 0) {
    fs.writeFileSync(path.join(rootDir, 'sites.config.yaml'), configLines.join('\n'));
  }

  for (const [fileName, content] of Object.entries(pages)) {
    fs.writeFileSync(path.join(rootDir, 'pages', fileName), content);
  }

  if (template !== undefined) {
    fs.mkdirSync(path.join(rootDir, 'templates'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'templates', 'base.yaml'), template);
  }
}

const FIXED_BUILD_TIME = new Date('2026-08-20T00:00:00.000Z');

const samplePageEntries = [
  { url: '/blog/post-a/', frontmatter: { title: 'Post A', tags: ['post'], date: '2026-05-20', lang: 'en' } },
  { url: '/blog/post-b/', frontmatter: { title: 'Post B', tags: ['post'], date: '2026-05-25', lang: 'en' } },
  { url: '/blog/post-c/', frontmatter: { title: 'Post C', tags: ['post'], lang: 'pt' } }
];

const sampleCollections = {
  post: samplePageEntries.map((entry) => ({ url: entry.url, data: entry.frontmatter }))
};

const sampleGlobalData = {
  site: {
    baseUrl: 'https://example.com/blog/',
    title: 'Example Blog',
    description: 'Blog description',
    name: 'Example'
  }
};

describe('normalizeRssConfig', () => {
  it('returns undefined for absent config', () => {
    expect(normalizeRssConfig(undefined)).toBeUndefined();
    expect(normalizeRssConfig(null)).toBeUndefined();
  });

  it('maps booleans to enabled/disabled', () => {
    expect(normalizeRssConfig(false)).toEqual({ enabled: false });
    expect(normalizeRssConfig(true)).toEqual({
      enabled: true,
      feeds: [{ outputPath: 'rss.xml', limit: 20 }]
    });
  });

  it('normalizes single-feed shorthand with defaults', () => {
    const config = normalizeRssConfig({ collection: 'post', outputPath: 'en/feed.xml' }, 'config');
    expect(config.feeds).toHaveLength(1);
    expect(config.feeds[0]).toMatchObject({ collection: 'post', outputPath: 'en/feed.xml', limit: 20 });
  });

  it('defaults named feed output paths and applies shared defaults', () => {
    const config = normalizeRssConfig(
      { limit: 5, feeds: { en: { collection: 'post' }, pt: { collection: 'post', language: 'pt' } } },
      'config'
    );
    expect(config.feeds).toEqual([
      { name: 'en', collection: 'post', limit: 5, outputPath: 'rss-en.xml' },
      { name: 'pt', collection: 'post', language: 'pt', limit: 5, outputPath: 'rss-pt.xml' }
    ]);
  });

  it('rejects non-object config', () => {
    expect(() => normalizeRssConfig('nope')).toThrow('expected a boolean or object');
  });

  it('rejects unsupported top-level keys', () => {
    expect(() => normalizeRssConfig({ collections: 'post' })).toThrow('Unsupported rss option "collections"');
  });

  it('rejects invalid limits', () => {
    expect(() => normalizeRssConfig({ limit: 0 })).toThrow('greater than zero');
    expect(() => normalizeRssConfig({ limit: 1.5 })).toThrow('expected an integer');
  });

  it('rejects mixing feeds with single-feed keys', () => {
    expect(() => normalizeRssConfig({ collection: 'post', feeds: { en: {} } })).toThrow('use either "feeds" or single-feed keys');
  });

  it('rejects duplicate output paths across feeds', () => {
    expect(() =>
      normalizeRssConfig({ feeds: { a: { outputPath: 'feed.xml' }, b: { outputPath: 'feed.xml' } } })
    ).toThrow('Duplicate rss outputPath');
  });

  it('rejects absolute output paths', () => {
    expect(() => normalizeRssConfig({ outputPath: '/feed.xml' })).toThrow('expected a relative output path');
  });

  it('rejects non-scalar filter values', () => {
    expect(() => normalizeRssConfig({ filter: { lang: { nested: true } } })).toThrow('expected a string, number, or boolean');
  });
});

describe('buildRssFeeds', () => {
  it('returns no feeds when rss is absent or false', () => {
    expect(buildRssFeeds({ pageEntries: samplePageEntries, collections: sampleCollections, globalData: sampleGlobalData })).toEqual([]);
    expect(buildRssFeeds({ pageEntries: samplePageEntries, collections: sampleCollections, rss: false, globalData: sampleGlobalData })).toEqual([]);
  });

  it('sorts by date descending and applies limit', () => {
    const [feed] = buildRssFeeds({
      pageEntries: samplePageEntries,
      collections: sampleCollections,
      rss: { collection: 'post', limit: 2 },
      globalData: sampleGlobalData,
      buildTime: FIXED_BUILD_TIME
    });

    expect(feed.xml).toContain('<title>Example Blog</title>');
    expect(feed.xml).toContain('<description>Blog description</description>');
    expect(feed.xml.indexOf('Post B')).toBeLessThan(feed.xml.indexOf('Post A'));
    expect(feed.xml).not.toContain('Post C');
    expect(feed.xml).toContain('Wed, 20 May 2026 00:00:00 GMT');
    expect(feed.xml).toContain('<atom:link href="https://example.com/blog/rss.xml" rel="self"');
  });

  it('filters by frontmatter and supports full-site feeds without a collection', () => {
    const [feed] = buildRssFeeds({
      pageEntries: samplePageEntries,
      collections: sampleCollections,
      rss: { filter: { lang: 'en' } },
      globalData: sampleGlobalData,
      buildTime: FIXED_BUILD_TIME
    });

    expect(feed.xml).toContain('Post A');
    expect(feed.xml).toContain('Post B');
    expect(feed.xml).not.toContain('Post C');
  });

  it('supports include/exclude URL patterns', () => {
    const [feed] = buildRssFeeds({
      pageEntries: samplePageEntries,
      collections: sampleCollections,
      rss: { collection: 'post', exclude: ['/blog/post-a/*'] },
      globalData: sampleGlobalData,
      buildTime: FIXED_BUILD_TIME
    });

    expect(feed.xml).not.toContain('Post A');
    expect(feed.xml).toContain('Post B');
  });

  it('throws when no site URL is configured', () => {
    expect(() =>
      buildRssFeeds({
        pageEntries: samplePageEntries,
        collections: sampleCollections,
        rss: { collection: 'post' },
        globalData: { site: {} }
      })
    ).toThrow('RSS generation requires rss.siteUrl or data.site.baseUrl.');
  });
});

describe('buildSite RSS integration', () => {
  it('does not write an RSS feed when rss is not configured', async () => {
    await withTempDir(async (tempDir) => {
      writeRssSite(tempDir, { dataSite: { baseUrl: 'https://example.com' } });

      await buildSite({ rootDir: tempDir, quiet: true });

      expect(fs.existsSync(path.join(tempDir, '_site', 'rss.xml'))).toBe(false);
    });
  });

  it('writes a feed at the configured output path', async () => {
    await withTempDir(async (tempDir) => {
      writeRssSite(tempDir, {
        dataSite: { baseUrl: 'https://example.com' },
        rssYaml: 'rss:\n  collection: post\n  outputPath: en/blog/feed.xml',
        pages: {
          'post.md': '---\ntitle: Hello\ntags: post\ndate: "2026-05-25"\n---\n# Hi'
        }
      });

      await buildSite({ rootDir: tempDir, quiet: true });

      const feed = fs.readFileSync(path.join(tempDir, '_site', 'en', 'blog', 'feed.xml'), 'utf8');
      expect(feed).toContain('<title>Hello</title>');
      expect(feed).toContain('<link>https://example.com/post/</link>');
    });
  });

  it('lets options.rss false disable configured feeds', async () => {
    await withTempDir(async (tempDir) => {
      writeRssSite(tempDir, {
        dataSite: { baseUrl: 'https://example.com' },
        rssYaml: 'rss:\n  collection: post',
        pages: {
          'post.md': '---\ntitle: Hello\ntags: post\n---\n# Hi'
        }
      });

      await buildSite({ rootDir: tempDir, rss: false, quiet: true });

      expect(fs.existsSync(path.join(tempDir, '_site', 'rss.xml'))).toBe(false);
    });
  });

  it('advertises feeds in rendered pages via pageData.rss', async () => {
    await withTempDir(async (tempDir) => {
      writeRssSite(tempDir, {
        dataSite: { baseUrl: 'https://example.com', title: 'Site Title' },
        rssYaml: 'rss:\n  collection: post\n  outputPath: feed.xml',
        template: [
          '- html:',
          '    - head:',
          '        - $if rss:',
          '            - $for feed in rss:',
          '                - link rel="alternate" type="application/rss+xml" title="${feed.title}" href="${feed.url}":',
          '    - body: "${content}"'
        ].join('\n'),
        pages: {
          'index.yaml': '---\ntemplate: base\n---\n- h1: Home',
          'post.md': '---\ntitle: Hello\ntags: post\n---\n# Hi'
        }
      });

      await buildSite({ rootDir: tempDir, quiet: true });

      const html = fs.readFileSync(path.join(tempDir, '_site', 'index.html'), 'utf8');
      expect(html).toContain('<link rel="alternate" type="application/rss+xml" title="Site Title" href="/feed.xml">');
    });
  });
});
