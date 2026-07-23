import { describe, expect, it } from 'vitest';
import watchSite, {
  classifyWatchChanges,
  createClientScript,
  getContentType,
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

  it('classifies styles and images as live-refreshable assets', () => {
    expect(classifyWatchChanges([
      { scope: 'static', relativePath: 'public/theme.css', publicPath: '/public/theme.css' },
      { scope: 'static', relativePath: 'images/hero.webp', publicPath: '/images/hero.webp' },
      { scope: 'static', relativePath: 'public/theme.css', publicPath: '/public/theme.css' },
    ])).toEqual({
      updateKind: 'assets',
      paths: ['/images/hero.webp', '/public/theme.css'],
    });
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
});
