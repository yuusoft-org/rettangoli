import { describe, expect, it } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';

// When a site has two broken inputs, the build reports the one it reads first:
// imported templates and partials, local partials, the data option, imported data, local data,
// templates, page sources, URL uniqueness, rendering, then the sitemap.
// Each broken input carries a marker word, which the YAML error snippet or the message repeats.

const notFound = async () => ({ ok: false, status: 404, statusText: 'Not Found', text: async () => '' });

const broken = {
  partial: { '/partials/card.yaml': 'brokenPartial: [\n' },
  data: { '/data/site.yaml': 'brokenData: [\n' },
  template: { '/templates/base.yaml': 'brokenTemplate: [\n' },
  pageFrontmatter: { '/pages/index.yaml': '---\nbrokenPage: [\n---\n- p: hi\n' },
  // Named to sort after the duplicates: URLs are checked for uniqueness only after every page is read.
  pageUrl: { '/pages/zzBrokenUrl.yaml': '---\nurl: /x?y=1\n---\n- p: hi\n' },
  renderError: { '/pages/render.yaml': '---\ntemplate: missingTemplate\n---\n- p: hi\n' },
  duplicateUrl: {
    '/pages/one.yaml': '---\nurl: /same/\n---\n- p: one\n',
    '/pages/two.yaml': '---\nurl: /same/\n---\n- p: two\n'
  }
};

const importedTemplate = { templates: { remoteTemplate: 'https://example.com/remoteTemplate.yaml' } };
const importedData = { data: { remoteData: 'https://example.com/remoteData.yaml' } };

async function buildError(files, options = {}) {
  const fs = createFsFromVolume(Volume.fromJSON({ '/pages/ok.yaml': '- p: ok\n', ...files }));
  try {
    await createSiteBuilder({ fs, rootDir: '/', quiet: true, fetchImpl: notFound, ...options })();
  } catch (error) {
    return error.message;
  }
  throw new Error('expected the build to fail');
}

describe('error precedence between two broken inputs', () => {
  it.each([
    ['a partial', 'a data file', { ...broken.partial, ...broken.data }, {}, 'brokenPartial', 'brokenData'],
    ['a data file', 'a template', { ...broken.data, ...broken.template }, {}, 'brokenData', 'brokenTemplate'],
    ['a template', 'a page', { ...broken.template, ...broken.pageFrontmatter }, {}, 'brokenTemplate', 'brokenPage'],
    ['an imported template', 'a local partial', broken.partial, { imports: importedTemplate }, 'remoteTemplate', 'brokenPartial'],
    ['a local partial', 'imported data', broken.partial, { imports: importedData }, 'brokenPartial', 'remoteData'],
    ['imported data', 'a local data file', broken.data, { imports: importedData }, 'remoteData', 'brokenData'],
    ['the data option', 'imported data', {}, { imports: importedData, data: 'brokenOption' }, 'Invalid site data', 'remoteData'],
    ['a local partial', 'the data option', broken.partial, { data: 'brokenOption' }, 'brokenPartial', 'Invalid site data'],
    ['a page URL', 'a duplicate URL', { ...broken.pageUrl, ...broken.duplicateUrl }, {}, 'zzBrokenUrl', 'Duplicate page URL'],
    ['a duplicate URL', 'a render error', { ...broken.duplicateUrl, ...broken.renderError }, {}, 'Duplicate page URL', 'missingTemplate'],
    ['a render error', 'the sitemap', broken.renderError, { sitemap: { siteUrl: 'https://example.com', brokenSitemap: true } }, 'missingTemplate', 'brokenSitemap']
  ])('%s wins over %s', async (_first, _second, files, options, winner, loser) => {
    const message = await buildError(files, options);

    expect(message).toContain(winner);
    expect(message).not.toContain(loser);
  });

  it('the components config is checked before any source is read', async () => {
    const message = await buildError({ ...broken.partial, ...broken.template }, { components: { dirs: [] }, imports: importedTemplate });

    expect(message).toBe('Invalid components config: expected an object with a non-empty "dirs" array.');
  });

  it.each([
    ['partials', '/partials/B.yaml', '/partials/a/x.yaml', 'brokenB', 'brokenA'],
    ['templates', '/templates/B.yaml', '/templates/a/x.yaml', 'brokenB', 'brokenA'],
    ['pages', '/pages/B.yaml', '/pages/a/x.yaml', 'brokenB', 'brokenA']
  ])('the first broken file of %s in directory-listing order wins', async (_kind, firstPath, secondPath, winner, loser) => {
    const body = (marker) => (firstPath.startsWith('/pages/') ? `---\n${marker}: [\n---\n- p: x\n` : `${marker}: [\n`);
    const message = await buildError({ [secondPath]: body(loser), [firstPath]: body(winner) });

    expect(message).toContain(winner);
    expect(message).not.toContain(loser);
  });

  it('a JSON and a YAML data file for the same key fail before either file is parsed', async () => {
    const message = await buildError({ '/data/a.yaml': 'brokenA: [\n', '/data/site.json': '{', '/data/site.yaml': 'x: 1\n' });

    expect(message).toBe('Conflicting data files "/data/site.json" and "/data/site.yaml": both define global data key "site". Keep only one of them.');
  });
});
