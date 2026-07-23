import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';
import watchSite, {
  classifyWatchChanges,
  createClientScript,
  createRebuildScheduler,
  finalizeWatchChanges,
  getContentType,
  getWatchResponseHeaders,
} from '../src/cli/watch.js';

describe('watch reload mode script', () => {
  it('uses keyed DOM morphing instead of body replacement in body mode', () => {
    const script = createClientScript('body', 7, 'test-session');
    expect(script).toContain("location.protocol === 'https:' ? 'wss://' : 'ws://'");
    expect(script).toContain("url.searchParams.set(HTML_CACHE_KEY");
    expect(script).toContain("const KEY_ATTRIBUTES = ['data-rtgl-key', 'data-key', 'id']");
    expect(script).toContain('morphBody(nextDocument.body)');
    expect(script).toContain('"initialRevision":7');
    expect(script).toContain('"initialSessionId":"test-session"');
    expect(script).not.toContain('document.body.innerHTML');
  });

  it('uses full page reload logic in full mode', () => {
    const script = createClientScript('full');
    expect(script).toContain("requestFullReload(data.updateKind === 'full'");
    expect(script).not.toContain('document.body.innerHTML');
  });

  it('classifies generated JavaScript changes as a safe full reload', () => {
    expect(classifyWatchChanges([
      { scope: 'static', relativePath: 'public/main.js', publicPath: '/public/main.js' },
    ])).toEqual({ updateKind: 'full', paths: [] });
  });

  it('gives executable code changes precedence over simultaneous HTML changes', () => {
    expect(classifyWatchChanges([
      { scope: 'pages', relativePath: 'index.yaml', publicPath: null },
      { scope: 'static', relativePath: 'public/main.mjs', publicPath: '/public/main.mjs' },
    ])).toEqual({ updateKind: 'full', paths: [] });
  });

  it('classifies YAHTML sources and static HTML as morphable HTML updates', () => {
    expect(classifyWatchChanges([
      { scope: 'templates', relativePath: 'default.yaml', publicPath: null },
    ])).toEqual({ updateKind: 'html', paths: [] });
    expect(classifyWatchChanges([
      { scope: 'static', relativePath: 'fallback.html', publicPath: '/fallback.html' },
    ])).toEqual({ updateKind: 'html', paths: [] });
  });

  it('classifies stylesheets as live-refreshable assets', () => {
    expect(classifyWatchChanges([
      { scope: 'static', relativePath: 'public/theme.css', publicPath: '/public/theme.css' },
      { scope: 'static', relativePath: 'public/theme.css', publicPath: '/public/theme.css' },
    ])).toEqual({
      updateKind: 'assets',
      paths: ['/public/theme.css'],
    });
  });

  it('uses a no-cache full reload for images that may only be referenced from CSS', () => {
    expect(classifyWatchChanges([
      { scope: 'static', relativePath: 'images/hero.webp', publicPath: '/images/hero.webp' },
    ])).toEqual({ updateKind: 'full', paths: [] });
    expect(classifyWatchChanges([
      { scope: 'pages', relativePath: 'index.yaml', publicPath: null },
      { scope: 'static', relativePath: 'images/background.svg', publicPath: '/images/background.svg' },
    ])).toEqual({ updateKind: 'full', paths: [] });
    expect(classifyWatchChanges([
      { scope: 'static', relativePath: 'public/favicon.ico', publicPath: '/public/favicon.ico' },
    ])).toEqual({ updateKind: 'full', paths: [] });
  });

  it('uses a full reload when a stylesheet or document icon was removed', () => {
    expect(classifyWatchChanges([
      {
        scope: 'static',
        relativePath: 'public/theme.css',
        publicPath: '/public/theme.css',
        removed: true,
      },
    ])).toEqual({ updateKind: 'full', paths: [] });
    expect(classifyWatchChanges([
      {
        scope: 'static',
        relativePath: 'public/favicon.ico',
        publicPath: '/public/favicon.ico',
        removed: true,
      },
    ])).toEqual({ updateKind: 'full', paths: [] });
  });

  it('finalizes deletion state after the build and clears it when an atomic save restores the path', async () => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), 'rettangoli-sites-watch-'),
    );
    const sourcePath = path.join(directory, 'theme.css');
    const change = {
      scope: 'static',
      relativePath: 'theme.css',
      publicPath: '/theme.css',
      sourcePath,
    };

    try {
      expect(finalizeWatchChanges([change])[0].removed).toBe(true);

      await writeFile(sourcePath, 'body { color: red; }');
      expect(finalizeWatchChanges([change])[0].removed).toBe(false);

      await rm(sourcePath);
      expect(finalizeWatchChanges([change])[0].removed).toBe(true);

      await writeFile(sourcePath, 'body { color: blue; }');
      expect(finalizeWatchChanges([change])[0].removed).toBe(false);
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it('uses a full reload for static assets the client cannot safely refresh', () => {
    expect(classifyWatchChanges([
      { scope: 'static', relativePath: 'manifest.webmanifest', publicPath: '/manifest.webmanifest' },
    ])).toEqual({ updateKind: 'full', paths: [] });
    expect(classifyWatchChanges([
      { scope: 'static', relativePath: 'data/catalog.json', publicPath: '/data/catalog.json' },
      { scope: 'static', relativePath: 'images/hero.webp', publicPath: '/images/hero.webp' },
    ])).toEqual({ updateKind: 'full', paths: [] });
  });

  it('keeps live-refreshable asset paths alongside a simultaneous HTML morph', () => {
    expect(classifyWatchChanges([
      { scope: 'pages', relativePath: 'index.yaml', publicPath: null },
      { scope: 'static', relativePath: 'public/theme.css', publicPath: '/public/theme.css' },
    ])).toEqual({
      updateKind: 'html',
      paths: ['/public/theme.css'],
    });
  });

  it('retains a failed script change until the next successful rebuild', async () => {
    const build = vi.fn()
      .mockRejectedValueOnce(new Error('Malformed page source'))
      .mockResolvedValueOnce(undefined);
    const server = { reloadAll: vi.fn() };
    const logger = {
      log: vi.fn(),
      error: vi.fn(),
    };
    const scheduleChange = createRebuildScheduler({
      rootDir: '/site',
      outputPath: '_site',
      server,
      logger,
      build,
    });

    scheduleChange({
      scope: 'static',
      relativePath: 'assets/app.js',
      publicPath: '/assets/app.js',
      sourcePath: '/site/static/assets/app.js',
    });
    scheduleChange({
      scope: 'pages',
      relativePath: 'index.yaml',
      publicPath: null,
      sourcePath: '/site/pages/index.yaml',
    });

    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledOnce();
    });
    expect(build).toHaveBeenCalledOnce();
    expect(server.reloadAll).not.toHaveBeenCalled();

    scheduleChange({
      scope: 'pages',
      relativePath: 'index.yaml',
      publicPath: null,
      sourcePath: '/site/pages/index.yaml',
    });

    await vi.waitFor(() => {
      expect(server.reloadAll).toHaveBeenCalledOnce();
    });
    expect(build).toHaveBeenCalledTimes(2);
    expect(server.reloadAll).toHaveBeenCalledWith({
      updateKind: 'full',
      paths: [],
    });
  });

  it('throws on invalid reload mode', async () => {
    await expect(watchSite({ reloadMode: 'instant' })).rejects.toThrow('Invalid reload mode');
  });

  it('throws on non-numeric port values', async () => {
    await expect(watchSite({ port: 'abc' })).rejects.toThrow('Invalid port "abc"');
  });

  it('throws on out-of-range port values', async () => {
    await expect(watchSite({ port: 70000 })).rejects.toThrow('Invalid port "70000"');
  });

  it('serves markdown as text instead of download-oriented binary type', () => {
    expect(getContentType('.md')).toBe('text/plain; charset=utf-8');
    expect(getContentType('.txt')).toBe('text/plain; charset=utf-8');
  });

  it('serves watch assets with no-store so a safe reload cannot reuse stale images', () => {
    expect(getWatchResponseHeaders('.webp')).toEqual({
      'Cache-Control': 'no-store',
      'Content-Type': 'image/webp',
    });
    expect(getWatchResponseHeaders('.avif')).toEqual({
      'Cache-Control': 'no-store',
      'Content-Type': 'image/avif',
    });
    expect(getWatchResponseHeaders('.md')).toEqual({
      'Cache-Control': 'no-store',
      'Content-Disposition': 'inline',
      'Content-Type': 'text/plain; charset=utf-8',
    });
  });
});
