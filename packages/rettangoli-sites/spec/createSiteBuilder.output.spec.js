import { describe, expect, it } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
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
});
