import nodeFs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';
import { buildSite } from '../src/cli/build.js';

const components = { dirs: ['src/components', 'src/pages'] };
const registry = { name: 'fake registry' };

function fakeFeServer() {
  return {
    loadComponents: vi.fn(async () => registry),
    renderComponent: vi.fn(({ component, props }) => ({
      html: `<${component} data-title="${props.title ?? ''}"><template shadowrootmode="open"><b>${props.title ?? 'none'} & more</b></template></${component}>`,
      head: ''
    }))
  };
}

function fixture(files = {}) {
  return createFsFromVolume(Volume.fromJSON({
    '/data/prerender.yaml': [
      'explore:',
      '  title: Explore',
      '  props:',
      '    title: Explore props',
      'stories:',
      '  - id: first',
      '    title: First Story'
    ].join('\n'),
    ...files
  }));
}

function builder(fs, feServer, options = {}) {
  return createSiteBuilder({
    fs,
    rootDir: '/',
    quiet: true,
    components,
    loadComponentRenderer: vi.fn(async () => feServer),
    ...options
  });
}

async function withTempDir(fn) {
  const tempDir = nodeFs.mkdtempSync(path.join(os.tmpdir(), 'rtgl-sites-components-'));
  try {
    return await fn(tempDir);
  } finally {
    nodeFs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function writeComponentSite(rootDir) {
  nodeFs.mkdirSync(path.join(rootDir, 'pages'), { recursive: true });
  nodeFs.writeFileSync(path.join(rootDir, 'pages', 'index.yaml'), '- body:\n    - ${renderComponent("x-app", app)}');
  nodeFs.writeFileSync(path.join(rootDir, 'sites.config.yaml'), [
    'components:',
    '  dirs:',
    '    - src/components',
    'data:',
    '  app:',
    '    title: From config'
  ].join('\n'));
}

describe('renderComponent', () => {
  it('inserts raw component HTML for a whole-item call and passes props through', async () => {
    const fs = fixture({
      '/pages/index.yaml': [
        '---',
        '_bind:',
        '  app: prerender.explore',
        '---',
        '- body:',
        '    - ${renderComponent("x-app", app)}',
        '    - p: after'
      ].join('\n')
    });
    const feServer = fakeFeServer();
    const loadComponentRenderer = vi.fn(async () => feServer);

    await builder(fs, feServer, { loadComponentRenderer })();

    const html = fs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toBe('<body><x-app data-title="Explore"><template shadowrootmode="open"><b>Explore & more</b></template></x-app><p>after</p></body>');
    expect(loadComponentRenderer).toHaveBeenCalledWith({ rootDir: '/' });
    expect(feServer.loadComponents).toHaveBeenCalledWith({
      cwd: '/',
      dirs: ['src/components', 'src/pages'],
      reload: expect.any(String),
    });
    expect(feServer.renderComponent).toHaveBeenCalledWith({
      component: 'x-app',
      components: registry,
      props: { title: 'Explore', props: { title: 'Explore props' } },
      serializeProps: true
    });
  });

  it.each([
    ['a single-quoted tag with dot-path props', "- div:\n    - ${renderComponent('x-app', prerender.explore.props)}", '<div><x-app data-title="Explore props">'],
    ['a quoted whole-item call', "- div:\n    - \"${renderComponent('x-app', prerender.explore.props)}\"", '<div><x-app data-title="Explore props">'],
    ['an element value', '- div: ${renderComponent("x-app", prerender.explore.props)}', '<div><x-app data-title="Explore props">'],
    ['a variable tag', '- div:\n    - ${renderComponent(tags.tag, prerender.explore.props)}', '<div><x-story data-title="Explore props">'],
    ['no props', '- div:\n    - ${renderComponent("x-app")}', '<div><x-app data-title=""><template shadowrootmode="open"><b>none & more</b>']
  ])('supports %s', async (_label, page, expected) => {
    const fs = fixture({
      '/data/tags.yaml': 'tag: x-story',
      '/pages/index.yaml': page
    });

    await builder(fs, fakeFeServer())();

    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain(expected);
  });

  it('passes an empty props object when props are omitted or missing', async () => {
    const fs = fixture({ '/pages/index.yaml': '- div:\n    - ${renderComponent("x-app")}\n    - ${renderComponent("x-app", missing.props)}' });
    const feServer = fakeFeServer();

    await builder(fs, feServer)();

    expect(feServer.renderComponent.mock.calls.map(([options]) => options.props)).toEqual([{}, {}]);
  });

  it('emits component HTML unescaped in head and script contexts of templates', async () => {
    const fs = fixture({
      '/templates/base.yaml': [
        '- html:',
        '    - head:',
        '        - ${renderComponent("x-head", app.props)}',
        '    - body:',
        '        - "${content}"',
        '        - script: ${renderComponent("x-script", app.props)}'
      ].join('\n'),
      '/pages/index.md': '---\ntemplate: base\n_bind:\n  app: prerender.explore\n---\n# Home'
    });

    await builder(fs, fakeFeServer())();

    const html = fs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('<head><x-head data-title="Explore props"><template shadowrootmode="open"><b>Explore props & more</b></template></x-head></head>');
    expect(html).toContain('<script><x-script data-title="Explore props">');
    expect(html).not.toContain('&lt;');
  });

  it('documents that a call interpolated inside a longer string is not raw HTML', async () => {
    const fs = fixture({ '/pages/index.yaml': '- div: "before ${renderComponent(\'x-app\', prerender.explore.props)} after"' });

    await builder(fs, fakeFeServer())();

    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain('<div>before [object Object] after</div>');
  });

  it('renders components per _each item and loads the registry once per build', async () => {
    const fs = fixture({
      '/pages/index.yaml': '- div:\n    - ${renderComponent("x-app", prerender.explore.props)}',
      '/pages/story.yaml': [
        '---',
        '_each:',
        '  data: prerender.stories',
        '  as: story',
        '  url: /stories/${story.id}/',
        '---',
        '- div:',
        '    - ${renderComponent("x-story", story)}'
      ].join('\n')
    });
    const feServer = fakeFeServer();
    const loadComponentRenderer = vi.fn(async () => feServer);
    const build = builder(fs, feServer, { loadComponentRenderer });

    await build();
    expect(fs.readFileSync('/_site/stories/first/index.html', 'utf8')).toContain('<x-story data-title="First Story">');
    expect(feServer.renderComponent).toHaveBeenCalledTimes(2);
    expect(loadComponentRenderer).toHaveBeenCalledTimes(1);
    expect(feServer.loadComponents).toHaveBeenCalledTimes(1);

    await build();
    expect(loadComponentRenderer).toHaveBeenCalledTimes(2);
    expect(feServer.loadComponents).toHaveBeenCalledTimes(2);
  });

  it('rethrows fe render errors with the tag and page path', async () => {
    const fs = fixture({ '/pages/about.yaml': '- div:\n    - ${renderComponent("x-missing", prerender.explore)}' });
    const feServer = fakeFeServer();
    feServer.renderComponent.mockImplementation(() => {
      throw new Error('[renderComponent] unknown root component "x-missing".');
    });

    await expect(builder(fs, feServer)()).rejects.toThrow(
      'renderComponent("x-missing") failed in /pages/about.yaml: [renderComponent] unknown root component "x-missing".'
    );
  });

  it('rejects a renderer result without html', async () => {
    const fs = fixture({ '/pages/index.yaml': '- div:\n    - ${renderComponent("x-app")}' });
    const feServer = fakeFeServer();
    feServer.renderComponent.mockReturnValue({ head: '' });

    await expect(builder(fs, feServer)()).rejects.toThrow('renderComponent("x-app") failed in /pages/index.yaml: expected @rettangoli/fe to return { html }.');
  });

  it('throws a clear error when components are not configured', async () => {
    const fs = fixture({ '/pages/index.yaml': '- div:\n    - ${renderComponent("x-app")}' });
    const loadComponentRenderer = vi.fn();

    await expect(builder(fs, null, { components: undefined, loadComponentRenderer })()).rejects.toThrow(
      'renderComponent("x-app") in /pages/index.yaml needs components: add components.dirs to sites.config.yaml.'
    );
    expect(loadComponentRenderer).not.toHaveBeenCalled();
  });

  it('does not load fe when components are not configured', async () => {
    const fs = fixture({ '/pages/index.yaml': '- p: Home' });
    const loadComponentRenderer = vi.fn();

    await builder(fs, null, { components: undefined, loadComponentRenderer })();

    expect(fs.readFileSync('/_site/index.html', 'utf8')).toBe('<p>Home</p>');
    expect(loadComponentRenderer).not.toHaveBeenCalled();
  });

  it('rejects an fe module without loadComponents', async () => {
    const fs = fixture({ '/pages/index.yaml': '- p: Home' });

    await expect(builder(fs, { renderComponent: () => ({ html: '' }) })()).rejects.toThrow(
      'does not export both loadComponents and renderComponent; upgrade @rettangoli/fe in the site project.'
    );
    expect(fs.existsSync('/_site')).toBe(false);
  });

  it('names the component directories when loading components fails', async () => {
    const fs = fixture({ '/pages/index.yaml': '- p: Home' });
    const feServer = fakeFeServer();
    feServer.loadComponents.mockRejectedValue(new Error('Invalid view'));

    await expect(builder(fs, feServer)()).rejects.toThrow('Failed to load components from src/components, src/pages: Invalid view');
  });

  it.each([
    ['an array', ['src/components']],
    ['missing dirs', {}],
    ['empty dirs', { dirs: [] }]
  ])('rejects an invalid components option: %s', async (_label, value) => {
    const fs = fixture({ '/pages/index.yaml': '- p: Home' });

    await expect(builder(fs, fakeFeServer(), { components: value })()).rejects.toThrow(
      'Invalid components config: expected an object with a non-empty "dirs" array.'
    );
  });
});

describe('components with buildSite', () => {
  it('renders real @rettangoli/fe components into generated pages, ready to hydrate', async () => {
    await withTempDir(async (tempDir) => {
      const files = {
        'sites.config.yaml': 'components:\n  dirs:\n    - components\n',
        'data/cards.json': JSON.stringify({ items: [{ id: 'first', title: 'First <card> & "more"' }] }),
        'pages/card.yaml': [
          '---',
          '_each:',
          '  data: cards.items',
          '  as: card',
          '  url: /cards/${card.id}/',
          '---',
          '- body:',
          '    - ${renderComponent("x-card", card)}'
        ].join('\n'),
        'components/card/card.schema.yaml': [
          'componentName: x-card',
          'propsSchema:',
          '  type: object',
          '  properties:',
          '    id: {}',
          '    title: {}'
        ].join('\n'),
        'components/card/card.view.yaml': 'template:\n  - h1: ${title}\n',
        'components/card/card.store.js': 'export const selectViewData = ({ props }) => ({ title: props.title });\n'
      };
      for (const [file, content] of Object.entries(files)) {
        nodeFs.mkdirSync(path.dirname(path.join(tempDir, file)), { recursive: true });
        nodeFs.writeFileSync(path.join(tempDir, file), content);
      }

      await buildSite({
        rootDir: tempDir,
        quiet: true,
        // This workspace's own fe, as a site project would have installed.
        loadComponentRenderer: () => import('@rettangoli/fe/server')
      });

      const html = nodeFs.readFileSync(path.join(tempDir, '_site', 'cards', 'first', 'index.html'), 'utf8');
      expect(html).toContain('<x-card data-rtgl-hydrate="" data-rtgl-props=""><template shadowrootmode="open">');
      expect(html).toContain('<h1>First &lt;card&gt; &amp; "more"</h1>');
      const json = html.match(/<script type="application\/json" data-rtgl-props="">(.*?)<\/script>/)[1];
      expect(json).not.toMatch(/[<>&]/);
      expect(JSON.parse(json)).toEqual({ id: 'first', title: 'First <card> & "more"' });
    });
  });

  it('passes components.dirs from sites.config.yaml and an injected loader through', async () => {
    await withTempDir(async (tempDir) => {
      writeComponentSite(tempDir);
      const feServer = fakeFeServer();
      const loadComponentRenderer = vi.fn(async () => feServer);

      await buildSite({ rootDir: tempDir, quiet: true, loadComponentRenderer });

      expect(loadComponentRenderer).toHaveBeenCalledWith({ rootDir: tempDir });
      expect(feServer.loadComponents).toHaveBeenCalledWith({ cwd: tempDir, dirs: ['src/components'], reload: expect.any(String) });
      expect(nodeFs.readFileSync(path.join(tempDir, '_site', 'index.html'), 'utf8')).toContain('<x-app data-title="From config">');
    });
  });

  it('resolves @rettangoli/fe/server from the site project root by default', async () => {
    await withTempDir(async (tempDir) => {
      writeComponentSite(tempDir);
      const fePackageDir = path.join(tempDir, 'node_modules', '@rettangoli', 'fe');
      nodeFs.mkdirSync(fePackageDir, { recursive: true });
      nodeFs.writeFileSync(path.join(fePackageDir, 'package.json'), JSON.stringify({
        name: '@rettangoli/fe',
        type: 'module',
        exports: { './server': './server.js' }
      }));
      nodeFs.writeFileSync(path.join(fePackageDir, 'server.js'), [
        'export const loadComponents = async ({ cwd, dirs }) => ({ cwd, dirs });',
        'export const renderComponent = ({ component, components, props, serializeProps }) => ({',
        '  html: `<${component} data-dirs="${components.dirs.join(",")}" data-serialize="${serializeProps}">${props.title}</${component}>`,',
        '  head: ""',
        '});'
      ].join('\n'));

      await buildSite({ rootDir: tempDir, quiet: true });

      expect(nodeFs.readFileSync(path.join(tempDir, '_site', 'index.html'), 'utf8')).toBe(
        '<body><x-app data-dirs="src/components" data-serialize="true">From config</x-app></body>'
      );
    });
  });

  it('fails with a clear message when @rettangoli/fe cannot be resolved from the project', async () => {
    await withTempDir(async (tempDir) => {
      writeComponentSite(tempDir);

      await expect(buildSite({ rootDir: tempDir, quiet: true })).rejects.toThrow(
        `"components" in sites.config.yaml needs @rettangoli/fe 1.6.0 or later (whose "@rettangoli/fe/server" entry exports loadComponents) installed in the site project at "${tempDir}".`
      );
      expect(nodeFs.existsSync(path.join(tempDir, '_site'))).toBe(false);
    });
  });

});
