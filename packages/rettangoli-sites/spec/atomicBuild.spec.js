import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';

const template = '- html:\n    - body:\n        - div: ${content}\n';
const page = (text, frontmatter = 'template: base') => `---\n${frontmatter}\n---\n- p: ${text}\n`;

function setup(files = {}, options = {}) {
  const vol = Volume.fromJSON({
    '/templates/base.yaml': template,
    '/partials/note.yaml': '- span: note\n',
    '/static/style.css': 'body{}',
    '/pages/a.yaml': page('a'),
    '/pages/b.yaml': page('b'),
    '/pages/c.md': '---\ntemplate: base\n---\n# C\n',
    ...files
  });
  const fs = createFsFromVolume(vol);
  const build = createSiteBuilder({
    fs,
    rootDir: '/',
    quiet: true,
    sitemap: { siteUrl: 'https://example.com' },
    functions: {
      boom: () => {
        throw new Error('boom');
      }
    },
    ...options
  });
  const output = () => Object.fromEntries(
    Object.entries(vol.toJSON('/_site')).sort(([a], [b]) => a.localeCompare(b))
  );
  return { fs, build, output };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a failed build leaves the previous output intact', () => {
  it.each([
    ['an unknown template', '/pages/b.yaml', page('b', 'template: missing'), 'Template "missing" not found'],
    ['an unknown partial', '/pages/b.yaml', '---\ntemplate: base\n---\n- $partial: missing\n', "Partial 'missing'"],
    ['a throwing function in the template', '/templates/base.yaml', '- html:\n    - body:\n        - p: ${boom()}\n        - div: ${content}\n', 'boom'],
    ['an invalid YAML page body', '/pages/b.yaml', '---\ntemplate: base\n---\n- p: [unclosed\n', 'Invalid YAML page content in /pages/b.yaml'],
    ['an invalid sitemap page option', '/pages/b.yaml', page('b', 'template: base\nsitemap:\n  priority: 7'), 'sitemap']
  ])('when the second build hits %s', async (_case, filePath, content, message) => {
    const { fs, build, output } = setup();
    await build();
    const before = output();
    expect(Object.keys(before)).toEqual([
      '/_site/a/index.html',
      '/_site/b/index.html',
      '/_site/c/index.html',
      '/_site/sitemap.xml',
      '/_site/style.css'
    ]);

    // A good edit to an earlier page must not reach the output either.
    fs.writeFileSync('/pages/a.yaml', page('a edited'));
    fs.writeFileSync(filePath, content);
    await expect(build()).rejects.toThrow(message);

    expect(output()).toEqual(before);
  });

  it('prints no build progress lines when the build fails', async () => {
    const { fs, build } = setup({}, { quiet: false });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await build();
    log.mockClear();

    fs.writeFileSync('/pages/b.yaml', page('b', 'template: missing'));
    await expect(build()).rejects.toThrow('Template "missing" not found');

    expect(log.mock.calls.map(([line]) => line)).toEqual(['Building collections...']);
  });
});

describe('a successful build', () => {
  it('still lets a page overwrite a static file with the same path', async () => {
    const { build, output } = setup({ '/static/a/index.html': 'static a' });
    await build();

    expect(output()['/_site/a/index.html']).toBe('<html><body><div><p>a</p></div></body></html>');
  });

  it('still replaces static/sitemap.xml with the generated sitemap', async () => {
    const { build, output } = setup({ '/static/sitemap.xml': 'static sitemap' });
    await build();

    expect(output()['/_site/sitemap.xml']).toContain('<loc>https://example.com/a/</loc>');
  });

  it('removes files left by the previous build', async () => {
    const { fs, build, output } = setup();
    await build();
    fs.unlinkSync('/pages/b.yaml');
    await build();

    expect(output()['/_site/b/index.html']).toBeUndefined();
  });

  it('logs the same lines in the same order', async () => {
    const { build } = setup({}, { quiet: false, keepMarkdownFiles: true });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await build();

    expect(log.mock.calls.map(([line]) => line)).toEqual([
      'Building collections...',
      'Starting build process...',
      'Copying static files...',
      '  -> Copied /static/style.css to /_site/style.css',
      'Processing /pages/a.yaml...',
      '  -> Written to /_site/a/index.html',
      'Processing /pages/b.yaml...',
      '  -> Written to /_site/b/index.html',
      'Processing /pages/c.md...',
      '  -> Written to /_site/c/index.html',
      '  -> Copied markdown to /_site/c.md',
      '  -> Written sitemap to /_site/sitemap.xml',
      'Build complete!'
    ]);
  });
});
