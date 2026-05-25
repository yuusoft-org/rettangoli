import { describe, expect, it, vi } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import yaml from 'js-yaml';
import { createSiteBuilder } from '../src/createSiteBuilder.js';

describe('createSiteBuilder output behavior', () => {
  it('writes generated files to custom outputPath', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/index.yaml': '- p: "hello world"',
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      outputPath: 'dist',
      quiet: true
    });

    await build();

    expect(memfs.existsSync('/dist/index.html')).toBe(true);
    expect(memfs.existsSync('/_site/index.html')).toBe(false);
  });

  it('cleans output directory before building', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/index.yaml': '- p: "hello world"',
      '/dist/stale.txt': 'stale-content'
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      outputPath: 'dist',
      quiet: true
    });

    await build();

    expect(memfs.existsSync('/dist/stale.txt')).toBe(false);
    expect(memfs.existsSync('/dist/index.html')).toBe(true);
  });

  it('uses frontmatter url to override output paths and page.url', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/templates/base.yaml': [
        '- html:',
        '    - body:',
        '        - p: "Page ${page.url}"',
        '        - p: "Frontmatter ${url}"'
      ].join('\n'),
      '/pages/about.yaml': [
        '---',
        'template: base',
        'url: company',
        '---',
        '- h1: About'
      ].join('\n'),
      '/pages/docs/source.md': [
        '---',
        'template: base',
        'url: /guides//start',
        '---',
        '# Start'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await build();

    expect(memfs.existsSync('/_site/company/index.html')).toBe(true);
    expect(memfs.existsSync('/_site/about/index.html')).toBe(false);
    expect(memfs.existsSync('/_site/guides/start/index.html')).toBe(true);
    expect(memfs.existsSync('/_site/docs/source/index.html')).toBe(false);

    const html = memfs.readFileSync('/_site/company/index.html', 'utf8');
    expect(html).toContain('<p>Page /company/</p>');
    expect(html).toContain('<p>Frontmatter /company/</p>');
  });

  it('allows frontmatter url to move a non-index page to the root route', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/home.md': [
        '---',
        'url: /',
        '---',
        '# Home'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await build();

    expect(memfs.existsSync('/_site/index.html')).toBe(true);
    expect(memfs.existsSync('/_site/home/index.html')).toBe(false);
    expect(memfs.readFileSync('/_site/index.html', 'utf8')).toContain('<h1 id="home">Home</h1>');
  });

  it('writes a configurable sitemap from generated page URLs', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/index.md': '# Home',
      '/pages/about.md': [
        '---',
        'sitemap:',
        '  changefreq: daily',
        '  priority: 0.9',
        '---',
        '# About'
      ].join('\n'),
      '/pages/drafts/one.md': '# Draft',
      '/pages/private.md': '# Private',
      '/pages/hidden.md': [
        '---',
        'sitemap: false',
        '---',
        '# Hidden'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true,
      data: {
        site: {
          baseUrl: 'https://example.com/docs/'
        }
      },
      sitemap: {
        outputPath: 'seo/sitemap.xml',
        defaults: {
          changefreq: 'weekly',
          priority: 0.5
        },
        exclude: ['/drafts/*'],
        pages: {
          '/about/': {
            lastmod: '2026-05-25',
            priority: 0.8
          },
          '/private/': false
        }
      }
    });

    await build();

    expect(memfs.existsSync('/_site/seo/sitemap.xml')).toBe(true);
    expect(memfs.readFileSync('/_site/seo/sitemap.xml', 'utf8')).toBe([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      '  <url>',
      '    <loc>https://example.com/docs/</loc>',
      '    <changefreq>weekly</changefreq>',
      '    <priority>0.5</priority>',
      '  </url>',
      '  <url>',
      '    <loc>https://example.com/docs/about/</loc>',
      '    <lastmod>2026-05-25</lastmod>',
      '    <changefreq>daily</changefreq>',
      '    <priority>0.9</priority>',
      '  </url>',
      '</urlset>',
      ''
    ].join('\n'));
  });

  it('requires a sitemap base URL when sitemap generation is enabled', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/index.md': '# Home'
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true,
      sitemap: true
    });

    await expect(build()).rejects.toThrow('Sitemap generation requires sitemap.siteUrl or data.site.baseUrl');
  });

  it('uses custom page URLs in collections', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/templates/list.yaml': [
        '- html:',
        '    - body:',
        '        - ul:',
        '            - $for post in collections.post:',
        '                li:',
        '                  - \'a href="${post.url}" data-frontmatter-url="${post.data.url}"\':',
        '                      - ${post.data.title}'
      ].join('\n'),
      '/pages/index.yaml': [
        '---',
        'template: list',
        '---',
        '- h1: Posts'
      ].join('\n'),
      '/pages/posts/original.md': [
        '---',
        'title: Renamed Post',
        'tags: post',
        'url: /news/renamed',
        '---',
        '# Renamed'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await build();

    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('href="/news/renamed/"');
    expect(html).toContain('data-frontmatter-url="/news/renamed/"');
    expect(memfs.existsSync('/_site/news/renamed/index.html')).toBe(true);
  });

  it('copies markdown files to the custom URL path when keepMarkdownFiles is enabled', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/docs/source.md': [
        '---',
        'url: /guides/start',
        '---',
        '# Start'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true,
      keepMarkdownFiles: true
    });

    await build();

    expect(memfs.existsSync('/_site/guides/start/index.html')).toBe(true);
    expect(memfs.existsSync('/_site/guides/start.md')).toBe(true);
    expect(memfs.existsSync('/_site/docs/source.md')).toBe(false);
  });

  it('rejects duplicate page URLs after normalization', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/about.md': '# About',
      '/pages/team.md': [
        '---',
        'url: /about',
        '---',
        '# Team'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await expect(build()).rejects.toThrow('Duplicate page URL "/about/"');
  });

  it('rejects duplicate path-derived page URLs', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/docs.md': '# Docs',
      '/pages/docs/index.md': '# Docs Index'
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await expect(build()).rejects.toThrow('Duplicate page URL "/docs/"');
  });

  it('rejects duplicate markdown copy targets when keepMarkdownFiles is enabled', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/docs/index.md': '# Docs',
      '/pages/other.md': [
        '---',
        'url: /docs/index',
        '---',
        '# Other'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true,
      keepMarkdownFiles: true
    });

    await expect(build()).rejects.toThrow('Duplicate markdown output path "docs/index.md"');
  });

  it.each([
    ['number', 'url: 42', 'expected a string'],
    ['empty string', 'url: ""', 'expected a non-empty string'],
    ['absolute URL', 'url: https://example.com/docs', 'site-relative URL path'],
    ['protocol-relative URL', 'url: //example.com/docs', 'site-relative URL path'],
    ['query string', 'url: /docs?preview=true', 'query strings or fragments'],
    ['fragment', 'url: /docs#intro', 'query strings or fragments'],
    ['dot segment', 'url: /docs/../admin', '"." or ".." segments'],
    ['encoded dot segment', 'url: /docs/%2e%2e/admin', '"." or ".." segments'],
    ['encoded slash', 'url: /docs%2Fadmin', 'encoded slashes or backslashes'],
    ['bad encoding', 'url: /docs/%zz', 'invalid URL encoding'],
    ['whitespace', 'url: /hello world', 'must not contain whitespace'],
    ['leading whitespace', 'url: " /docs"', 'must not contain whitespace'],
    ['trailing whitespace', 'url: "/docs "', 'must not contain whitespace']
  ])('rejects invalid custom page url: %s', async (caseName, urlLine, expectedMessage) => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/index.md': [
        '---',
        urlLine,
        '---',
        '# Broken'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await expect(build(), caseName).rejects.toThrow(expectedMessage);
  });

  it('refuses to clean when outputPath resolves to rootDir', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/index.yaml': '- p: "hello world"'
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      outputPath: '.',
      quiet: true
    });

    await expect(build()).rejects.toThrow('Refusing to clean output path');
  });

  it('treats markdown separators as content when frontmatter is not at top of file', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/index.md': [
        '# Intro',
        '',
        '---',
        '',
        'middle section',
        '',
        '---',
        '',
        'end section'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await build();

    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('middle section');
    expect(html).toContain('end section');
  });

  it('throws a clear error when frontmatter YAML is invalid', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/index.md': [
        '---',
        'title: [',
        '---',
        '# Broken'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await expect(build()).rejects.toThrow('Invalid frontmatter in /pages/index.md');
  });

  it('throws a clear error when YAML page body is invalid', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/index.yaml': '- div:\n    - ['
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await expect(build()).rejects.toThrow('Invalid YAML page content in /pages/index.yaml');
  });

  it('resolves frontmatter _bind aliases from global data', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/data/feDocs.yaml': [
        'header:',
        '  label: Rettangoli FE Docs'
      ].join('\n'),
      '/templates/base.yaml': [
        '- html:',
        '    - body:',
        '        - rtgl-text: ${docs.header.label}',
      ].join('\n'),
      '/pages/index.md': [
        '---',
        'template: base',
        '_bind:',
        '  docs: feDocs',
        '---',
        '# Intro'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await build();

    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('Rettangoli FE Docs');
  });

  it('throws a clear error when _bind references unknown global data', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/templates/base.yaml': '- html:',
      '/pages/index.md': [
        '---',
        'template: base',
        '_bind:',
        '  docs: missingDocs',
        '---',
        '# Intro'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await expect(build()).rejects.toThrow('Invalid _bind in /pages/index.md for "docs": global data key "missingDocs" not found.');
  });

  it('ignores non-yaml files in partials directory', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/partials/header.yaml': '- h1: Header',
      '/partials/.DS_Store': ':\n[not-yaml',
      '/pages/index.yaml': '- h1: Hello'
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await build();
    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('<h1>Hello</h1>');
  });

  it('ignores schema sidecar yaml files in partials directory', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/partials/header.yaml': '- h1: Header',
      '/partials/header.schema.yaml': [
        '$schema: https://json-schema.org/draft/2020-12/schema',
        'type: object'
      ].join('\n'),
      '/templates/base.yaml': [
        '- html:',
        '    - body:',
        '        - $partial: header'
      ].join('\n'),
      '/pages/index.md': [
        '---',
        'template: base',
        '---',
        '# Hello'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await build();
    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('<h1>Header</h1>');
  });

  it('ignores schema sidecar yaml files in templates directory', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/templates/base.yaml': [
        '- html:',
        '    - body:',
        '        - rtgl-text: ${title}'
      ].join('\n'),
      '/templates/base.schema.yaml': [
        '$schema: https://json-schema.org/draft/2020-12/schema',
        'type: object'
      ].join('\n'),
      '/pages/index.md': [
        '---',
        'template: base',
        'title: Template With Sidecar Schema',
        '---',
        '# Hello'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await build();
    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('Template With Sidecar Schema');
  });

  it('loads symlinked template files from the templates directory', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.mkdirSync('/shared/templates', { recursive: true });
    vol.mkdirSync('/templates', { recursive: true });
    vol.mkdirSync('/pages', { recursive: true });
    vol.writeFileSync('/shared/templates/base.yaml', [
      '- html:',
      '    - body:',
      '        - rtgl-text: ${title}'
    ].join('\n'));
    vol.symlinkSync('/shared/templates/base.yaml', '/templates/base.yaml');
    vol.writeFileSync('/pages/index.md', [
      '---',
      'template: base',
      'title: Symlink Template',
      '---',
      '# Intro'
    ].join('\n'));

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await build();

    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('Symlink Template');
  });

  it('loads symlinked partial files from the partials directory', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.mkdirSync('/shared/partials', { recursive: true });
    vol.mkdirSync('/partials', { recursive: true });
    vol.mkdirSync('/templates', { recursive: true });
    vol.mkdirSync('/pages', { recursive: true });
    vol.writeFileSync('/shared/partials/hero.yaml', '- rtgl-text: ${headline}');
    vol.symlinkSync('/shared/partials/hero.yaml', '/partials/hero.yaml');
    vol.writeFileSync('/templates/base.yaml', [
      '- html:',
      '    - body:',
      '        - $partial: hero',
      '          headline: ${title}'
    ].join('\n'));
    vol.writeFileSync('/pages/index.md', [
      '---',
      'template: base',
      'title: Symlink Partial',
      '---',
      '# Intro'
    ].join('\n'));

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await build();

    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('Symlink Partial');
  });

  it('replaces markdown template content placeholder in all occurrences', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/templates/base.yaml': [
        '- html:',
        '    - body:',
        '        - "${content}"',
        '        - div:',
        '            - "${content}"'
      ].join('\n'),
      '/pages/index.md': [
        '---',
        'template: base',
        '---',
        '# Hello'
      ].join('\n')
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await build();
    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).not.toContain('___MARKDOWN_CONTENT_PLACEHOLDER_');
    expect((html.match(/<h1[^>]*>Hello<\/h1>/g) || []).length).toBe(2);
  });

  it('copies original markdown files to output when keepMarkdownFiles is enabled', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/index.md': [
        '---',
        'title: Home',
        '---',
        '# Hello'
      ].join('\n'),
      '/pages/docs/intro.md': '# Intro'
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true,
      keepMarkdownFiles: true
    });

    await build();

    expect(memfs.existsSync('/_site/index.html')).toBe(true);
    expect(memfs.existsSync('/_site/docs/intro/index.html')).toBe(true);
    expect(memfs.existsSync('/_site/index.md')).toBe(true);
    expect(memfs.existsSync('/_site/docs/intro.md')).toBe(true);
    expect(memfs.readFileSync('/_site/docs/intro.md', 'utf8')).toBe('# Intro');
  });

  it('does not copy markdown files by default', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/docs/intro.md': '# Intro'
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });

    await build();

    expect(memfs.existsSync('/_site/docs/intro/index.html')).toBe(true);
    expect(memfs.existsSync('/_site/docs/intro.md')).toBe(false);
  });

  it('renders pages with URL-imported template and partial aliases', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/index.md': [
        '---',
        'template: docs/documentation',
        'title: Hello',
        '---',
        '# Welcome'
      ].join('\n')
    });

    const remoteFiles = {
      'https://example.com/templates/docs-documentation.yaml': [
        '- html:',
        '    - body:',
        '        - $partial: docs/nav',
        '          title: ${title}',
        '        - "${content}"'
      ].join('\n'),
      'https://example.com/partials/docs-nav.yaml': '- rtgl-text: "Navigation ${title}"'
    };

    const fetchImpl = vi.fn(async (url) => {
      const content = remoteFiles[url];
      if (!content) {
        return { ok: false, status: 404, statusText: 'Not Found', text: async () => '' };
      }
      return { ok: true, status: 200, statusText: 'OK', text: async () => content };
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true,
      imports: {
        templates: {
          'docs/documentation': 'https://example.com/templates/docs-documentation.yaml'
        },
        partials: {
          'docs/nav': 'https://example.com/partials/docs-nav.yaml'
        }
      },
      fetchImpl
    });

    await build();

    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('Navigation Hello');
    expect(html).toContain('Welcome');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(memfs.existsSync('/.rettangoli/sites/imports/templates')).toBe(true);
    expect(memfs.existsSync('/.rettangoli/sites/imports/partials')).toBe(true);
    expect(memfs.readdirSync('/.rettangoli/sites/imports/templates').length).toBe(1);
    expect(memfs.readdirSync('/.rettangoli/sites/imports/partials').length).toBe(1);
    expect(memfs.existsSync('/.rettangoli/sites/imports/index.yaml')).toBe(true);

    const indexContent = memfs.readFileSync('/.rettangoli/sites/imports/index.yaml', 'utf8');
    const index = yaml.load(indexContent, { schema: yaml.JSON_SCHEMA });
    expect(index.version).toBe(1);
    expect(index.entries).toEqual([
      {
        alias: 'docs/nav',
        type: 'partial',
        url: 'https://example.com/partials/docs-nav.yaml',
        hash: expect.any(String),
        path: expect.stringMatching(/^\.rettangoli\/sites\/imports\/partials\/[a-f0-9]{64}\.yaml$/)
      },
      {
        alias: 'docs/documentation',
        type: 'template',
        url: 'https://example.com/templates/docs-documentation.yaml',
        hash: expect.any(String),
        path: expect.stringMatching(/^\.rettangoli\/sites\/imports\/templates\/[a-f0-9]{64}\.yaml$/)
      }
    ]);
  });

  it('reuses on-disk import cache for subsequent builds without network calls', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/index.md': [
        '---',
        'template: docs/documentation',
        'title: Cached',
        '---',
        'Body'
      ].join('\n')
    });

    const firstFetch = vi.fn(async (url) => {
      if (url === 'https://example.com/templates/docs-documentation.yaml') {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => [
            '- html:',
            '    - body:',
            '        - $partial: docs/nav',
            '          title: ${title}',
            '        - "${content}"'
          ].join('\n')
        };
      }

      if (url === 'https://example.com/partials/docs-nav.yaml') {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => '- rtgl-text: "Cached ${title}"'
        };
      }

      return { ok: false, status: 404, statusText: 'Not Found', text: async () => '' };
    });

    const firstBuild = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true,
      imports: {
        templates: {
          'docs/documentation': 'https://example.com/templates/docs-documentation.yaml'
        },
        partials: {
          'docs/nav': 'https://example.com/partials/docs-nav.yaml'
        }
      },
      fetchImpl: firstFetch
    });

    await firstBuild();
    expect(firstFetch).toHaveBeenCalledTimes(2);

    const secondFetch = vi.fn(async () => {
      throw new Error('network should not be called');
    });

    const secondBuild = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true,
      imports: {
        templates: {
          'docs/documentation': 'https://example.com/templates/docs-documentation.yaml'
        },
        partials: {
          'docs/nav': 'https://example.com/partials/docs-nav.yaml'
        }
      },
      fetchImpl: secondFetch
    });

    await secondBuild();
    expect(secondFetch).not.toHaveBeenCalled();

    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('Cached Cached');
  });

  it('lets local partial files override URL-imported partial aliases', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/partials/docs/nav.yaml': '- rtgl-text: "Local ${title}"',
      '/pages/index.md': [
        '---',
        'template: docs/documentation',
        'title: Hello',
        '---',
        'Body'
      ].join('\n')
    });

    const fetchImpl = vi.fn(async (url) => {
      if (url === 'https://example.com/templates/docs-documentation.yaml') {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => [
            '- html:',
            '    - body:',
            '        - $partial: docs/nav',
            '          title: ${title}',
            '        - "${content}"'
          ].join('\n')
        };
      }

      if (url === 'https://example.com/partials/docs-nav.yaml') {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => '- rtgl-text: "Remote ${title}"'
        };
      }

      return { ok: false, status: 404, statusText: 'Not Found', text: async () => '' };
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true,
      imports: {
        templates: {
          'docs/documentation': 'https://example.com/templates/docs-documentation.yaml'
        },
        partials: {
          'docs/nav': 'https://example.com/partials/docs-nav.yaml'
        }
      },
      fetchImpl
    });

    await build();

    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('Local Hello');
    expect(html).not.toContain('Remote Hello');
  });

  it('lets URL-imported templates use default() for theme overrides', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/default.md': [
        '---',
        'template: docs',
        'title: Default Theme',
        '---',
        'Default body'
      ].join('\n'),
      '/pages/custom.md': [
        '---',
        'template: docs',
        'title: Custom Theme',
        'themeCssHref: /public/custom-theme.css',
        'themeBodyClass: nord-dark',
        '---',
        'Custom body'
      ].join('\n')
    });

    const remoteFiles = {
      'https://example.com/templates/docs.yaml': [
        '- html:',
        '    - head:',
        '        - link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@rettangoli/ui@1.0.19/dist/themes/base.css":',
        '        - link rel="stylesheet" href="${default(themeCssHref, \'/public/theme-rtgl-themes.css\')}":',
        '    - body class="${default(themeBodyClass, \'slate-dark\')}":',
        '        - h1: ${title}',
        '        - "${content}"'
      ].join('\n')
    };

    const fetchImpl = vi.fn(async (url) => {
      const content = remoteFiles[url];
      if (!content) {
        return { ok: false, status: 404, statusText: 'Not Found', text: async () => '' };
      }
      return { ok: true, status: 200, statusText: 'OK', text: async () => content };
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true,
      imports: {
        templates: {
          docs: 'https://example.com/templates/docs.yaml'
        }
      },
      fetchImpl
    });

    await build();

    const defaultHtml = memfs.readFileSync('/_site/default/index.html', 'utf8');
    expect(defaultHtml).toContain('href="/public/theme-rtgl-themes.css"');
    expect(defaultHtml).toContain('<body class="slate-dark">');

    const customHtml = memfs.readFileSync('/_site/custom/index.html', 'utf8');
    expect(customHtml).toContain('href="/public/custom-theme.css"');
    expect(customHtml).toContain('<body class="nord-dark">');
  });

  it('applies inline site data to imported template defaults', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/pages/index.md': [
        '---',
        'template: docs',
        'title: Inline Theme',
        '---',
        'Body'
      ].join('\n')
    });

    const remoteFiles = {
      'https://example.com/templates/docs.yaml': [
        '- html:',
        '    - head:',
        '        - link rel="stylesheet" href="${default(themeCssHref, \'/public/theme-rtgl-themes.css\')}":',
        '    - body class="${default(themeBodyClass, \'slate-dark\')}":',
        '        - h1: ${title}',
        '        - "${content}"'
      ].join('\n')
    };

    const fetchImpl = vi.fn(async (url) => {
      const content = remoteFiles[url];
      if (!content) {
        return { ok: false, status: 404, statusText: 'Not Found', text: async () => '' };
      }
      return { ok: true, status: 200, statusText: 'OK', text: async () => content };
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true,
      data: {
        themeCssHref: '/public/theme.css',
        themeBodyClass: 'dark'
      },
      imports: {
        templates: {
          docs: 'https://example.com/templates/docs.yaml'
        }
      },
      fetchImpl
    });

    await build();

    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('href="/public/theme.css"');
    expect(html).toContain('<body class="dark">');
  });

  it('prefers file data over inline config on key conflicts', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/data/site.yaml': 'RouteVN\n',
      '/pages/index.yaml': '- p: ${site}'
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true,
      data: {
        site: {
          title: 'RouteVN'
        }
      }
    });

    await build();

    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('<p>RouteVN</p>');
  });
});
