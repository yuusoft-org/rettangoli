import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';

// The sitekit/README content slot ("- ${content}") and a tag slot ("main: ${content}").
const childSlotTemplate = '- html:\n    - body:\n        - h1: ${title}\n        - "${content}"\n';
const tagSlotTemplate = '- html:\n    - body:\n        - h1: ${title}\n        - main: "${content}"\n';
const frontmatterOnly = '---\ntemplate: base\ntitle: T\n---\n';
const noBodyError = 'Invalid page /pages/index.yaml: the page has no body and no template. Add YAML content or a "template" frontmatter key.';
const unclosedError = 'Invalid page /pages/index.yaml: frontmatter starting with "---" is never closed, so the page has no body. Add a closing "---" line.';
const unclosedWarning = (file) => `Frontmatter in ${file} starts with "---" but is never closed, so the whole file is read as frontmatter. Add a closing "---" line.`;

async function build(files, output = '/_site/index.html') {
  const fs = createFsFromVolume(Volume.fromJSON(files));
  await createSiteBuilder({ fs, rootDir: '/', quiet: true })();
  return fs.readFileSync(output, 'utf8');
}

afterEach(() => vi.restoreAllMocks());

describe('page sources', () => {
  it.each([
    ['A1 frontmatter-only page, child-slot template', { '/templates/base.yaml': childSlotTemplate, '/pages/index.yaml': frontmatterOnly }, '<html><body><h1>T</h1></body></html>'],
    ['A2 frontmatter-only page, tag-slot template', { '/templates/base.yaml': tagSlotTemplate, '/pages/index.yaml': frontmatterOnly }, '<html><body><h1>T</h1><main></main></body></html>'],
    ['A3 comment-only body, child-slot template', { '/templates/base.yaml': childSlotTemplate, '/pages/index.yaml': `${frontmatterOnly}# TODO: fill in\n` }, '<html><body><h1>T</h1></body></html>'],
    ['A6 frontmatter and body, child-slot template', { '/templates/base.yaml': childSlotTemplate, '/pages/index.yaml': `${frontmatterOnly}- p: hi\n` }, '<html><body><h1>T</h1><p>hi</p></body></html>'],
    ['A7 frontmatter-only markdown page', { '/templates/base.yaml': childSlotTemplate, '/pages/index.md': frontmatterOnly }, '<html><body><h1>T</h1></body></html>'],
    ['A8 explicit empty list body', { '/templates/base.yaml': childSlotTemplate, '/pages/index.yaml': `${frontmatterOnly}[]\n` }, '<html><body><h1>T</h1></body></html>'],
    ['B1 leading "---" then a list body', { '/pages/index.yaml': '---\n- h1: Hello\n- p: World\n' }, '<h1>Hello</h1><p>World</p>'],
    ['B4 list body without a leading "---"', { '/pages/index.yaml': '- h1: Hello\n- p: World\n' }, '<h1>Hello</h1><p>World</p>'],
    ['leading "---" then a scalar body', { '/pages/index.yaml': '---\nJust text\n' }, 'Just text'],
    ['closed frontmatter that is not a mapping is ignored', { '/pages/index.yaml': '---\n- a\n---\n- p: x\n' }, '<p>x</p>'],
    ['comment-only body without a template', { '/pages/index.yaml': '# nothing here\n' }, '']
  ])('%s', async (_label, files, expected) => {
    expect(await build(files)).toBe(expected);
  });

  it('B3 renders a leading "---" list page next to other pages', async () => {
    const files = { '/pages/index.yaml': '- p: fine\n', '/pages/about.yaml': '---\n- h1: About\n' };
    expect(await build(files, '/_site/about/index.html')).toBe('<h1>About</h1>');
  });

  it('renders a leading "---" list page that starts with a byte order mark', async () => {
    expect(await build({ '/pages/index.yaml': '\uFEFF---\n- h1: Hello\n' })).toBe('<h1>Hello</h1>');
  });

  it.each([
    ['A4 frontmatter-only page without a template', '---\ntitle: T\n---\n'],
    ['A5 empty page', '']
  ])('%s fails with an error that names the file', async (_label, page) => {
    await expect(build({ '/pages/index.yaml': page })).rejects.toThrow(new Error(noBodyError));
  });

  it('B2 unclosed mapping frontmatter without a template fails with an error that names the file', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(build({ '/pages/index.yaml': '---\nhtml:\n  - body:\n      - p: hi\n' })).rejects.toThrow(new Error(unclosedError));
    expect(warn.mock.calls).toEqual([[unclosedWarning('/pages/index.yaml')]]);
  });

  it('warns about unclosed frontmatter and renders an empty body with a template', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await build({ '/templates/base.yaml': tagSlotTemplate, '/pages/index.yaml': '---\ntemplate: base\ntitle: T\n' }))
      .toBe('<html><body><h1>T</h1><main></main></body></html>');
    expect(warn.mock.calls).toEqual([[unclosedWarning('/pages/index.yaml')]]);
  });

  it('warns about unclosed frontmatter in a markdown page and renders it as before', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await build({ '/pages/index.md': '---\n\nSome text\n' })).toBe('');
    expect(warn.mock.calls).toEqual([[unclosedWarning('/pages/index.md')]]);
  });

  it('does not warn about closed frontmatter, a "----" line or a leading "---" list page', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await build({
      '/pages/index.md': '---\ntitle: T\n---\n# Hi\n',
      '/pages/rule.md': '----\n\nText\n',
      '/pages/list.yaml': '---\n- p: x\n'
    });
    expect(warn).not.toHaveBeenCalled();
  });
});
