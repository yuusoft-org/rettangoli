import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Keep the real builder but record how it is called.
vi.mock('../src/createSiteBuilder.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, createSiteBuilder: vi.fn(actual.createSiteBuilder) };
});

import { createSiteBuilder } from '../src/index.js';
import { buildSite, createBuildOptions } from '../src/cli/build.js';
import { createViteWatchClientModuleSource, createWatchClientScript } from '../src/cli/watchClient.js';

const tempDirs = [];

function makeSite(files) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rtgl-sites-contract-'));
  tempDirs.push(rootDir);
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(rootDir, file)), { recursive: true });
    fs.writeFileSync(path.join(rootDir, file), content);
  }
  return rootDir;
}

afterEach(() => {
  vi.clearAllMocks();
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('programmatic builder contract', () => {
  // An app that embeds the builder builds a site on the real fs with no config.
  it('builds a site on the real filesystem from createSiteBuilder({ fs, rootDir, quiet })()', async () => {
    const rootDir = makeSite({
      'templates/base.yaml': '- html:\n    - head:\n        - title: ${title}\n    - body:\n        - "${content}"',
      'data/prerender.json': JSON.stringify({ stories: [{ id: 'a', title: 'Fish & <Chips>' }] }),
      'pages/vn/story.yaml': [
        '---',
        'template: base',
        '_each:',
        '  data: prerender.stories',
        '  as: story',
        '  url: /vn/${story.id}/',
        'title: ${story.title}',
        '---',
        '- p: Story'
      ].join('\n'),
      'pages/index.md': '# Home'
    });

    await createSiteBuilder({ fs, rootDir, quiet: true })();

    expect(fs.readFileSync(path.join(rootDir, '_site', 'index.html'), 'utf8')).toContain('<h1');
    const story = fs.readFileSync(path.join(rootDir, '_site', 'vn', 'a', 'index.html'), 'utf8');
    expect(story).toContain('<title>Fish &amp; &lt;Chips&gt;</title>');
  });
});

describe('rtgl CLI contract', () => {
  it('buildSite hands the config and every CLI option to createSiteBuilder under the documented names', async () => {
    const rootDir = makeSite({
      'sites.config.yaml': [
        'data:',
        '  site:',
        '    baseUrl: https://example.com',
        'build:',
        '  keepMarkdownFiles: true',
        'markdownit:',
        '  linkify: true'
      ].join('\n'),
      'pages/index.md': '# Home'
    });
    const md = { render: (text) => `<p>${text.trim()}</p>` };
    const functions = { shout: (value) => String(value).toUpperCase() };
    const loadComponentRenderer = async () => ({});

    await buildSite({
      rootDir,
      outputPath: 'out',
      md,
      functions,
      sitemap: false,
      quiet: true,
      isScreenshotMode: true,
      loadComponentRenderer
    });

    expect(createSiteBuilder).toHaveBeenCalledTimes(1);
    const [options] = createSiteBuilder.mock.calls[0];
    expect(options).toEqual({
      fs,
      rootDir,
      outputPath: 'out',
      md,
      markdown: { linkify: true },
      keepMarkdownFiles: true,
      imports: {},
      data: { site: { baseUrl: 'https://example.com' } },
      sitemap: false,
      functions,
      components: undefined,
      loadComponentRenderer,
      quiet: true,
      isScreenshotMode: true
    });
    expect(fs.readFileSync(path.join(rootDir, 'out', 'index.html'), 'utf8')).toBe('<p># Home</p>');
    expect(fs.existsSync(path.join(rootDir, 'out', 'sitemap.xml'))).toBe(false);
  });

  it('buildSite defaults to the _site output folder, loud logs and no screenshot mode', async () => {
    const rootDir = makeSite({ 'pages/index.md': '# Home' });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      await buildSite({ rootDir });
    } finally {
      log.mockRestore();
    }

    const [options] = createSiteBuilder.mock.calls[0];
    expect(options).toMatchObject({ rootDir, outputPath: '_site', quiet: false, isScreenshotMode: false });
    expect(fs.existsSync(path.join(rootDir, '_site', 'index.html'))).toBe(true);
  });

  it('createBuildOptions lets an explicit sitemap option win over the config and keeps the config sitemap otherwise', () => {
    const config = { sitemap: { exclude: ['/x/'] } };

    expect(createBuildOptions(config, { sitemap: false }).sitemap).toBe(false);
    expect(createBuildOptions(config, {}).sitemap).toBe(config.sitemap);
    expect(createBuildOptions({}, {})).toMatchObject({
      markdown: {},
      keepMarkdownFiles: false,
      imports: {},
      data: {},
      sitemap: undefined,
      functions: {}
    });
  });

  it('createWatchClientScript embeds the marker that vt matches on', () => {
    expect(createWatchClientScript('body', 0, null)).toContain('data-rtgl-watch-client');
  });

  it('createViteWatchClientModuleSource listens for the vt event through the Vite HMR bridge', () => {
    const source = createViteWatchClientModuleSource({ eventName: 'rettangoli:vt-watch', reloadMode: 'body' });

    expect(source).toContain('rettangoli:vt-watch');
    expect(source).toContain('import.meta.hot');
    expect(source).toContain('rettangoli:vt-watch:state-request');
    expect(source).toContain('vite:ws:connect');
  });
});
