import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';

const indexPath = '/.rettangoli/sites/imports/index.yaml';
const navUrl = 'https://example.com/partials/nav.yaml';
const footerUrl = 'https://example.com/partials/footer.yaml';
const baseUrl = 'https://example.com/templates/base.yaml';
const sha = (url) => createHash('sha256').update(url).digest('hex');
const navCachePath = `/.rettangoli/sites/imports/partials/${sha(navUrl)}.yaml`;

const remoteFiles = {
  [navUrl]: '- nav: Nav\n',
  [footerUrl]: '- footer: Footer\n',
  [baseUrl]: '- html:\n    - body:\n        - $partial: nav\n        - "${content}"\n'
};
const fetchImpl = async (url) => ({ ok: true, status: 200, statusText: 'OK', text: async () => remoteFiles[url] });
const page = { '/pages/index.yaml': '---\ntemplate: base\n---\n- p: hello\n' };
const imports = { templates: { base: baseUrl }, partials: { nav: navUrl } };

// The index text the builder has always written for `imports`.
const expectedIndex = [
  'version: 1',
  'entries:',
  '  - alias: nav',
  '    type: partial',
  `    url: ${navUrl}`,
  `    hash: ${sha(navUrl)}`,
  `    path: .rettangoli/sites/imports/partials/${sha(navUrl)}.yaml`,
  '  - alias: base',
  '    type: template',
  `    url: ${baseUrl}`,
  `    hash: ${sha(baseUrl)}`,
  `    path: .rettangoli/sites/imports/templates/${sha(baseUrl)}.yaml`,
  ''
].join('\n');

function build(fs, options = {}) {
  return createSiteBuilder({ fs, rootDir: '/', quiet: true, imports, fetchImpl, ...options })();
}

// Wrap an fs so that the listed methods throw for one path.
function failingFs(fs, failures) {
  return new Proxy(fs, {
    get(target, key) {
      const value = target[key];
      if (typeof value !== 'function') return value;
      return (...args) => {
        if (failures[key] && args[0] === failures[key]) {
          throw Object.assign(new Error(`EACCES: permission denied, ${key} '${args[0]}'`), { code: 'EACCES' });
        }
        return value.apply(target, args);
      };
    }
  });
}

afterEach(() => vi.restoreAllMocks());

describe('import index', () => {
  it('writes the same index text as before for the configured aliases', async () => {
    const fs = createFsFromVolume(Volume.fromJSON(page));

    await build(fs);

    expect(fs.readFileSync(indexPath, 'utf8')).toBe(expectedIndex);
    expect(fs.readFileSync('/_site/index.html', 'utf8')).toBe('<html><body><nav>Nav</nav><p>hello</p></body></html>');
  });

  it.each([
    ['entries that are not a list', 'version: 1\nentries: 3\n'],
    ['an unsupported version', 'version: 2\nentries: []\n'],
    ['invalid YAML', 'version: 1\nentries: [\n'],
    ['an entry without a type', 'version: 1\nentries:\n  - alias: nav\n    url: x\n    hash: abc\n    path: p\n']
  ])('rebuilds an index with %s instead of failing the build', async (_label, content) => {
    const fs = createFsFromVolume(Volume.fromJSON({ ...page, [indexPath]: content }));

    await build(fs);

    expect(fs.readFileSync(indexPath, 'utf8')).toBe(expectedIndex);
  });

  it('leaves the index alone when no template or partial imports are configured', async () => {
    const fs = createFsFromVolume(Volume.fromJSON({ '/pages/index.yaml': '- p: hello\n', [indexPath]: 'version: 1\nentries: 3\n' }));

    await build(fs, { imports: {} });

    expect(fs.readFileSync(indexPath, 'utf8')).toBe('version: 1\nentries: 3\n');
    expect(fs.readFileSync('/_site/index.html', 'utf8')).toBe('<p>hello</p>');
  });

  it('drops the entry of an alias that is no longer configured', async () => {
    const fs = createFsFromVolume(Volume.fromJSON(page));

    await build(fs, { imports: { ...imports, partials: { nav: navUrl, footer: footerUrl } } });
    expect(fs.readFileSync(indexPath, 'utf8')).toContain('alias: footer');

    await build(fs);
    expect(fs.readFileSync(indexPath, 'utf8')).toBe(expectedIndex);
  });

  it('does not rewrite an index whose text is unchanged', async () => {
    const fs = createFsFromVolume(Volume.fromJSON(page));
    await build(fs);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await build(failingFs(fs, { writeFileSync: indexPath }));

    expect(warn).not.toHaveBeenCalled();
    expect(fs.readFileSync(indexPath, 'utf8')).toBe(expectedIndex);
  });

  it('warns and finishes the build when the index cannot be written', async () => {
    const fs = createFsFromVolume(Volume.fromJSON(page));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await build(failingFs(fs, { writeFileSync: indexPath }));

    expect(warn.mock.calls).toEqual([[
      `Could not write import index ${indexPath}: EACCES: permission denied, writeFileSync '${indexPath}'`
    ]]);
    expect(fs.readFileSync('/_site/index.html', 'utf8')).toBe('<html><body><nav>Nav</nav><p>hello</p></body></html>');
  });

  it('warns and finishes the build when the existing index cannot be read', async () => {
    const fs = createFsFromVolume(Volume.fromJSON(page));
    await build(fs);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await build(failingFs(fs, { readFileSync: indexPath }));

    expect(warn.mock.calls).toEqual([[
      `Could not write import index ${indexPath}: EACCES: permission denied, readFileSync '${indexPath}'`
    ]]);
    expect(fs.existsSync('/_site/index.html')).toBe(true);
  });
});

describe('import cache', () => {
  it('finishes the build with the fetched content when the cache folder cannot be created', async () => {
    const fs = createFsFromVolume(Volume.fromJSON(page));

    await build(failingFs(fs, { mkdirSync: '/.rettangoli/sites/imports/partials' }));

    expect(fs.readFileSync('/_site/index.html', 'utf8')).toBe('<html><body><nav>Nav</nav><p>hello</p></body></html>');
    expect(fs.existsSync(navCachePath)).toBe(false);
  });
});
