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
});
