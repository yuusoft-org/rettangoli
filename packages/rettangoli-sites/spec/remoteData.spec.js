import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';

const catalogUrl = 'https://example.com/catalog.yaml';
const response = (text) => ({ ok: true, text: async () => text });

function fixture(files = {}) {
  return createFsFromVolume(Volume.fromJSON({
    '/pages/index.yaml': '- p: ${catalog.title}',
    ...files
  }));
}

function builder(fs, fetchImpl, options = {}) {
  return createSiteBuilder({
    fs,
    rootDir: '/',
    quiet: true,
    imports: { data: { catalog: catalogUrl } },
    fetchImpl,
    ...options
  });
}

afterEach(() => vi.restoreAllMocks());

describe('remote data imports', () => {
  it('makes data available to templates, partials, loops, and _bind', async () => {
    const fs = fixture({
      '/pages/index.yaml': [
        '---', 'template: base', '_bind:', '  items: catalog', '---',
        '- $for item in items.novels:',
        '    - $partial: card',
        '      title: ${item.title}'
      ].join('\n'),
      '/templates/base.yaml': '- html:\n    - body:\n        - h1: ${catalog.title}\n        - "${content}"',
      '/partials/card.yaml': '- p: ${title}'
    });
    const fetchImpl = vi.fn(async () => response('title: Library\nnovels:\n  - title: First Novel\n  - title: Second Novel'));

    await builder(fs, fetchImpl)();

    const html = fs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('<h1>Library</h1>');
    expect(html).toContain('<p>First Novel</p>');
    expect(html).toContain('<p>Second Novel</p>');
    expect(html).not.toContain(catalogUrl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fs.existsSync('/.rettangoli')).toBe(false);
  });

  it('fetches fresh data on repeated builds and newly created builders, ignoring disk cache', async () => {
    const hash = createHash('sha256').update(catalogUrl).digest('hex');
    const cachePath = `/.rettangoli/sites/imports/data/${hash}.yaml`;
    const fs = fixture({ [cachePath]: 'title: Stale' });
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response('title: First'))
      .mockResolvedValueOnce(response('title: Second'))
      .mockResolvedValueOnce(response('title: Third'));
    const build = builder(fs, fetchImpl);

    await build();
    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain('<p>First</p>');
    await build();
    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain('<p>Second</p>');
    await builder(fs, fetchImpl)();
    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain('<p>Third</p>');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl).toHaveBeenCalledWith(catalogUrl, {
      cache: 'no-store', signal: expect.any(AbortSignal)
    });
    expect(fs.readFileSync(cachePath, 'utf8')).toBe('title: Stale');
    expect(fs.existsSync('/.rettangoli/sites/imports/index.yaml')).toBe(false);
  });

  it('overrides inline defaults with remote data and remote data with page frontmatter', async () => {
    const fs = fixture({
      '/pages/index.yaml': '- p: ${catalog.title} / ${catalog.subtitle}',
      '/pages/custom.yaml': '---\ncatalog:\n  title: Page\n---\n- p: ${catalog.title} / ${catalog.subtitle}'
    });

    await builder(fs, async () => response('title: Remote'), {
      data: { catalog: { title: 'Inline', subtitle: 'Default subtitle' } }
    })();

    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain('<p>Remote / Default subtitle</p>');
    expect(fs.readFileSync('/_site/custom/index.html', 'utf8')).toContain('<p>Page / Default subtitle</p>');
  });

  it.each(['yaml', 'yml'])('lets a local .%s file replace the entire remote alias, but still fetches it', async (extension) => {
    const fs = fixture({
      [`/data/catalog.${extension}`]: 'title: Local',
      '/pages/index.yaml': '- p: ${catalog.title} / ${default(catalog.remoteOnly, "Absent")}'
    });
    const fetchImpl = vi.fn(async () => response('title: Remote\nremoteOnly: Remote field'));

    await builder(fs, fetchImpl)();

    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain('<p>Local / Absent</p>');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['array', '- One\n- Two', '- div:\n    - $for item in catalog:\n        - p: ${item}', '<p>Two</p>'],
    ['string', 'Hello', '- p: ${catalog}', '<p>Hello</p>'],
    ['number', '42', '- p: ${catalog}', '<p>42</p>'],
    ['boolean', 'false', '- p: ${jsonStringify(catalog)}', '<p>false</p>'],
    ['null', 'null', '- p: ${jsonStringify(catalog)}', '<p>null</p>']
  ])('supports a YAML %s just like local data', async (_label, content, page, expected) => {
    const fs = fixture({ '/pages/index.yaml': page });
    await builder(fs, async () => response(content))();
    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain(expected);
  });

  it.each([
    ['HTTP error', async () => ({ ok: false, status: 503, statusText: 'Service Unavailable' }), 'HTTP 503'],
    ['network error', async () => { throw new Error('Connection failed'); }, 'Connection failed'],
    ['invalid YAML', async () => response('title: [invalid'), 'Invalid YAML'],
    ['body read error', async () => ({ ok: true, text: async () => { throw new Error('Body interrupted'); } }), 'Body interrupted']
  ])('fails on %s after a successful build without falling back to old data', async (_label, fail, message) => {
    const fs = fixture();
    const fetchImpl = vi.fn().mockResolvedValueOnce(response('title: First')).mockImplementationOnce(fail);
    const build = builder(fs, fetchImpl);
    await build();

    await expect(build()).rejects.toThrow(`Failed to load imported data "catalog" from "${catalogUrl}"`);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain('<p>First</p>');

    await expect(builder(fs, fail)()).rejects.toThrow(message);
  });

  it('fails when the remote source is unavailable even if a local alias exists', async () => {
    const fs = fixture({ '/data/catalog.yaml': 'title: Local' });
    await expect(builder(fs, async () => { throw new Error('Offline'); })()).rejects.toThrow('Offline');
    expect(fs.existsSync('/_site')).toBe(false);
  });

  it('aborts a data request after the 30-second timeout', async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    const fetchImpl = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }));
    const build = builder(fixture(), fetchImpl)();
    const rejected = expect(build).rejects.toThrow('Timed out');
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    expect(timeout).toHaveBeenCalledWith(30_000);
    controller.abort(new Error('Timed out'));
    await rejected;
  });

  it('preserves template and partial caching while refetching data', async () => {
    const fs = fixture({ '/pages/index.yaml': '---\ntemplate: base\n---\n- p: ${catalog.title}' });
    const fetchImpl = vi.fn(async (url) => {
      if (url === catalogUrl) return response('title: Fresh');
      if (url.endsWith('base.yaml')) return response('- html:\n    - body:\n        - $partial: header\n        - "${content}"');
      return response('- h1: ${catalog.title}');
    });
    const build = builder(fs, fetchImpl, {
      imports: {
        templates: { base: 'https://example.com/base.yaml' },
        partials: { header: 'https://example.com/header.yaml' },
        data: { catalog: catalogUrl }
      }
    });

    await build();
    await build();
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      'https://example.com/base.yaml', 'https://example.com/header.yaml', catalogUrl, catalogUrl
    ]);
    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain('<h1>Fresh</h1>');
  });
});
