import { describe, expect, it } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';

const okTemplate = '- html:\n    - body:\n        - ${content}\n';
const page = '---\ntitle: x\n---\n- p: hi\n';

async function buildError(files, options = {}) {
  const fs = createFsFromVolume(Volume.fromJSON(files));
  try {
    await createSiteBuilder({ fs, rootDir: '/', quiet: true, ...options })();
  } catch (error) {
    return error;
  }
  throw new Error('expected the build to fail');
}

describe('YAML syntax errors name the file', () => {
  it.each([
    ['partial', { '/partials/nav/broken.yaml': '- div: [a, b\n', '/pages/index.yaml': page }, 'partial file "/partials/nav/broken.yaml"'],
    ['data', { '/data/site.yaml': 'title: [unclosed\n', '/pages/index.yaml': page }, 'data file "/data/site.yaml"'],
    ['template', { '/templates/base.yaml': '- html: [unclosed\n', '/pages/index.yaml': '---\ntemplate: base\n---\n- p: hi\n' }, 'template file "/templates/base.yaml"']
  ])('in a %s file', async (_kind, files, label) => {
    const error = await buildError(files);

    expect(error.message.startsWith(`${label}: Invalid YAML: `)).toBe(true);
    expect(error.message).toContain('unexpected end of the stream within a flow collection');
  });

  it('keeps the existing labels for page frontmatter, page bodies and JSON data', async () => {
    expect((await buildError({ '/pages/fm.yaml': '---\ntitle: [unclosed\n---\n- p: hi\n' })).message)
      .toMatch(/^Invalid frontmatter in \/pages\/fm\.yaml: /);
    expect((await buildError({ '/pages/body.yaml': '---\ntitle: x\n---\n- p: [unclosed\n' })).message)
      .toMatch(/^Invalid YAML page content in \/pages\/body\.yaml: /);
    expect((await buildError({ '/data/site.json': '{"a": ', '/pages/index.yaml': page })).message)
      .toMatch(/^data file "\/data\/site\.json": Invalid JSON: /);
  });
});

describe('render errors name the page and the template', () => {
  it('names the page and the template when the template fails', async () => {
    const error = await buildError({
      '/templates/base.yaml': '- html:\n    - body:\n        - p: ${nope()}\n        - ${content}\n',
      '/pages/about.yaml': '---\ntemplate: base\n---\n- p: hi\n'
    });

    expect(error.message).toBe(`Failed to render /pages/about.yaml with template "base": ${error.cause.message}`);
    expect(error.cause.message).toContain('nope');
  });

  it('names the markdown page and the template when the template fails', async () => {
    const error = await buildError({
      '/templates/base.yaml': '- html:\n    - body:\n        - p: ${nope()}\n        - ${content}\n',
      '/pages/post.md': '---\ntemplate: base\n---\n# Hello\n'
    });

    expect(error.message).toBe(`Failed to render /pages/post.md with template "base": ${error.cause.message}`);
  });

  it('names the page when its body fails to render', async () => {
    const error = await buildError({
      '/templates/base.yaml': okTemplate,
      '/pages/contact.yaml': '---\ntemplate: base\n---\n- p: ${nope()}\n'
    });

    expect(error.message).toBe(`Failed to render /pages/contact.yaml with template "base": ${error.cause.message}`);
  });

  it('names the page for a missing partial', async () => {
    const error = await buildError({ '/pages/z.yaml': '- $partial: doesnotexist\n' });

    expect(error.message).toBe(`Failed to render /pages/z.yaml: ${error.cause.message}`);
    expect(error.cause.message).toContain('doesnotexist');
  });

  it('names the page when the HTML conversion fails', async () => {
    const error = await buildError({ '/pages/y.yaml': '---\ntitle: y\n---\n- ".cls": hi\n' });

    expect(error.message).toBe(`Failed to render /pages/y.yaml: ${error.cause.message}`);
    expect(error.cause.message).toMatch(/^Malformed YAHTML element/);
  });

  it('keeps the original error as the cause of a user function error', async () => {
    const boom = new Error('boom from user function');
    const error = await buildError(
      { '/pages/index.yaml': '- p: ${boom()}\n' },
      { functions: { boom() { throw boom; } } }
    );

    expect(error.message).toBe(`Failed to render /pages/index.yaml: ${error.cause.message}`);
    expect(error.cause.message).toContain('boom from user function');
  });

  it('does not label a renderComponent error twice', async () => {
    const error = await buildError(
      { '/pages/about.yaml': '- div:\n    - ${renderComponent("x-a", app)}\n', '/data/app.yaml': 'n: 1\n' },
      {
        components: { dirs: ['src/components'] },
        loadComponentRenderer: async () => ({
          loadComponents: async () => ({}),
          renderComponent: () => { throw new Error('render exploded'); }
        })
      }
    );

    expect(error.message).not.toMatch(/^Failed to render/);
    expect(error.message.split('/pages/about.yaml')).toHaveLength(2);
    expect(error.message).toContain('renderComponent("x-a") failed in /pages/about.yaml: ');
  });
});
