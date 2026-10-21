import { describe, expect, it } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';

const stories = [
  'stories:',
  '  - id: first',
  '    title: First Story',
  '    summary: The first one',
  '    genres: [mystery]',
  '  - id: second',
  '    title: Second Story',
  '    summary: The second one',
  '    genres: [mystery, romance]'
].join('\n');

const baseTemplate = [
  '- html:',
  '    - head:',
  '        - title: ${title}',
  '        - meta name="description" content="${description}":',
  '    - body:',
  '        - "${content}"'
].join('\n');

const storyPage = (frontmatter = [], body = ['- h1: ${story.title}']) => [
  '---',
  'template: base',
  '_each:',
  '  data: prerender.stories',
  '  as: story',
  '  url: /vn/${story.id}/',
  'title: ${story.title}',
  'description: ${story.summary}',
  ...frontmatter,
  '---',
  ...body
].join('\n');

function fixture(files = {}) {
  return createFsFromVolume(Volume.fromJSON({
    '/data/prerender.yaml': stories,
    '/templates/base.yaml': baseTemplate,
    ...files
  }));
}

function builder(fs, options = {}) {
  return createSiteBuilder({ fs, rootDir: '/', quiet: true, ...options });
}

describe('_each pages', () => {
  it('writes one YAML page per item with per-item frontmatter, page context, and template context', async () => {
    const fs = fixture({
      '/pages/vn/story.yaml': storyPage([], [
        '- h1: ${story.title}',
        '- p: ${page.url} ${url}'
      ])
    });

    await builder(fs)();

    const first = fs.readFileSync('/_site/vn/first/index.html', 'utf8');
    expect(first).toContain('<title>First Story</title>');
    expect(first).toContain('content="The first one"');
    expect(first).toContain('<h1>First Story</h1>');
    expect(first).toContain('<p>/vn/first/ /vn/first/</p>');
    const second = fs.readFileSync('/_site/vn/second/index.html', 'utf8');
    expect(second).toContain('<title>Second Story</title>');
    expect(second).toContain('<h1>Second Story</h1>');
    expect(fs.existsSync('/_site/vn/story/index.html')).toBe(false);
  });

  it('writes one markdown page per item and copies the source to each generated URL with keepMarkdownFiles', async () => {
    const source = storyPage([], ['# Story body']);
    const fs = fixture({
      '/templates/base.yaml': '- html:\n    - body:\n        - h1: ${story.title}\n        - "${content}"',
      '/pages/vn/story.md': source
    });

    await builder(fs, { keepMarkdownFiles: true })();

    const first = fs.readFileSync('/_site/vn/first/index.html', 'utf8');
    expect(first).toContain('<h1>First Story</h1>');
    expect(first).toContain('Story body');
    expect(fs.readFileSync('/_site/vn/second/index.html', 'utf8')).toContain('<h1>Second Story</h1>');
    expect(fs.readFileSync('/_site/vn/first.md', 'utf8')).toBe(source);
    expect(fs.existsSync('/_site/vn/second.md')).toBe(true);
    expect(fs.existsSync('/_site/vn/story.md')).toBe(false);
  });

  it('renders frontmatter values that are not strings and keeps whole-expression values raw', async () => {
    const fs = fixture({
      '/templates/base.yaml': '- p: ${jsonStringify(genres)} ${jsonStringify(meta)} ${count}',
      '/pages/story.yaml': storyPage(['genres: ${story.genres}', 'count: 3', 'meta:', '  slug: ${story.id}'])
    });

    await builder(fs)();

    expect(fs.readFileSync('/_site/vn/second/index.html', 'utf8'))
      .toContain('<p>[&quot;mystery&quot;,&quot;romance&quot;] {&quot;slug&quot;:&quot;second&quot;} 3</p>');
  });

  it('renders frontmatter and URLs with _bind values and template functions', async () => {
    const fs = fixture({
      '/data/site.yaml': 'name: Example Site',
      '/templates/base.yaml': '- p: ${title}',
      '/pages/story.yaml': [
        '---',
        'template: base',
        '_bind:',
        '  siteInfo: site',
        '_each:',
        '  data: prerender.stories',
        '  as: story',
        '  url: /vn/${default(story.slug, story.id)}/',
        'title: ${story.title} - ${siteInfo.name}',
        '---',
        '- p: Body'
      ].join('\n')
    });

    await builder(fs)();

    expect(fs.readFileSync('/_site/vn/first/index.html', 'utf8')).toContain('<p>First Story - Example Site</p>');
  });

  it('produces no pages for an empty array', async () => {
    const fs = fixture({
      '/data/prerender.yaml': 'stories: []',
      '/pages/index.yaml': '- p: Home',
      '/pages/story.yaml': storyPage()
    });

    await builder(fs)();

    expect(fs.existsSync('/_site/index.html')).toBe(true);
    expect(fs.existsSync('/_site/vn')).toBe(false);
    expect(fs.existsSync('/_site/story/index.html')).toBe(false);
  });

  it('includes generated pages in collections and the sitemap', async () => {
    const fs = fixture({
      '/templates/list.yaml': [
        '- ul:',
        '    - $for post in collections.mystery:',
        '        - li:',
        '            - a href="${post.url}": ${post.data.title}'
      ].join('\n'),
      '/pages/index.yaml': '---\ntemplate: list\n---\n- p: Home',
      '/pages/story.yaml': storyPage(['tags: ${story.genres}', 'sitemap:', '  priority: 0.8'])
    });

    await builder(fs, { data: { site: { baseUrl: 'https://example.com' } } })();

    const html = fs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('<a href="/vn/first/">First Story</a>');
    expect(html).toContain('<a href="/vn/second/">Second Story</a>');
    const sitemapXml = fs.readFileSync('/_site/sitemap.xml', 'utf8');
    expect(sitemapXml).toContain('<loc>https://example.com/</loc>');
    expect(sitemapXml).toContain('<loc>https://example.com/vn/first/</loc>\n    <priority>0.8</priority>');
    expect(sitemapXml).toContain('<loc>https://example.com/vn/second/</loc>');
  });

  it('keeps _each out of public frontmatter', async () => {
    const fs = fixture({
      '/templates/base.yaml': '- p: ${jsonStringify(collections.story)}',
      '/pages/story.yaml': storyPage(['tags: story'])
    });

    await builder(fs)();

    const html = fs.readFileSync('/_site/vn/first/index.html', 'utf8');
    expect(html).not.toContain('_each');
    expect(html).toContain('&quot;url&quot;:&quot;/vn/first/&quot;');
  });

  it('normalizes generated URLs like custom url frontmatter', async () => {
    const fs = fixture({
      '/pages/story.yaml': storyPage().replace('url: /vn/${story.id}/', 'url: vn//${story.id}')
    });

    await builder(fs)();

    expect(fs.existsSync('/_site/vn/first/index.html')).toBe(true);
  });

  it('rejects duplicate URLs between generated pages and normal pages', async () => {
    const fs = fixture({
      '/pages/vn/first.yaml': '- p: Existing',
      '/pages/story.yaml': storyPage()
    });

    await expect(builder(fs)()).rejects.toThrow('Duplicate page URL "/vn/first/" in /pages/vn/first.yaml; already used by /pages/story.yaml (_each item 0).');
  });

  it('rejects duplicate URLs between generated pages', async () => {
    const fs = fixture({
      '/pages/story.yaml': storyPage().replace('url: /vn/${story.id}/', 'url: /vn/same/')
    });

    await expect(builder(fs)()).rejects.toThrow('Duplicate page URL "/vn/same/" in /pages/story.yaml (_each item 1); already used by /pages/story.yaml (_each item 0).');
  });

  it('rejects an invalid generated URL with the item in the message', async () => {
    const fs = fixture({
      '/pages/story.yaml': storyPage().replace('url: /vn/${story.id}/', 'url: https://example.com/${story.id}')
    });

    await expect(builder(fs)()).rejects.toThrow('Invalid url in /pages/story.yaml (_each item 0): expected a site-relative URL path.');
  });

  it('rejects _each together with url frontmatter', async () => {
    const fs = fixture({ '/pages/story.yaml': storyPage(['url: /vn/']) });

    await expect(builder(fs)()).rejects.toThrow('Invalid _each in /pages/story.yaml: remove the "url" frontmatter key; "_each.url" sets the URL of each generated page.');
  });

  it('rejects a missing data path', async () => {
    const fs = fixture({ '/pages/story.yaml': storyPage().replace('data: prerender.stories', 'data: prerender.missing') });

    await expect(builder(fs)()).rejects.toThrow('Invalid _each in /pages/story.yaml: global data path "prerender.missing" not found.');
  });

  it.each([
    ['an object', 'data: prerender', 'got object'],
    ['a string', 'data: prerender.stories.0.id', 'got string']
  ])('rejects a data path that resolves to %s', async (_label, dataLine, actualType) => {
    const fs = fixture({ '/pages/story.yaml': storyPage().replace('data: prerender.stories', dataLine) });

    await expect(builder(fs)()).rejects.toThrow(`must resolve to an array, ${actualType}.`);
  });

  it.each([
    ['not an object', '_each: prerender.stories', 'expected an object with "data", "as", and "url".'],
    ['an array', '_each: [prerender.stories]', 'expected an object with "data", "as", and "url".'],
    ['an unknown key', '_each:\n  data: prerender.stories\n  as: story\n  url: /vn/${story.id}/\n  key: id', 'unsupported key "key". Supported keys: data, as, url.'],
    ['missing data', '_each:\n  as: story\n  url: /vn/${story.id}/', '"data" must be a non-empty string.'],
    ['empty as', '_each:\n  data: prerender.stories\n  as: ""\n  url: /vn/', '"as" must be a non-empty string.'],
    ['non-string url', '_each:\n  data: prerender.stories\n  as: story\n  url: 42', '"url" must be a non-empty string.'],
    ['an invalid as name', '_each:\n  data: prerender.stories\n  as: the-story\n  url: /vn/', '"as" must be a variable name'],
    ['a dotted as name', '_each:\n  data: prerender.stories\n  as: story.item\n  url: /vn/', '"as" must be a variable name'],
    ['a reserved as name', '_each:\n  data: prerender.stories\n  as: page\n  url: /vn/', '"as" must not be a reserved name (collections, page, build, content).'],
    ['an as name used by _bind', '_bind:\n  story: prerender\n_each:\n  data: prerender.stories\n  as: story\n  url: /vn/', '"as" name "story" is already used by _bind.']
  ])('rejects _each that is %s', async (_label, eachLines, message) => {
    const fs = fixture({ '/pages/story.yaml': `---\n${eachLines}\n---\n- p: Story` });

    await expect(builder(fs)()).rejects.toThrow(`Invalid _each in /pages/story.yaml: ${message}`);
  });

  it('names the page and item when per-item rendering fails', async () => {
    const fs = fixture({ '/pages/story.yaml': storyPage(['label: ${missingFunction(story.id)}']) });

    await expect(builder(fs)()).rejects.toThrow('Invalid _each in /pages/story.yaml for item 0:');
  });
});

describe('_bind dot paths', () => {
  it('resolves nested global data paths', async () => {
    const fs = fixture({
      '/data/prerender.yaml': 'explore:\n  heading: Explore stories',
      '/pages/index.yaml': '---\n_bind:\n  app: prerender.explore\n---\n- h1: ${app.heading}'
    });

    await builder(fs)();

    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain('<h1>Explore stories</h1>');
  });

  it('prefers an exact top-level key that contains a dot', async () => {
    const fs = fixture({
      '/data/prerender.yaml': 'explore:\n  heading: Nested',
      '/pages/index.yaml': '---\n_bind:\n  app: prerender.explore\n---\n- h1: ${app.heading}'
    });

    await builder(fs, { data: { 'prerender.explore': { heading: 'Exact key' } } })();

    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain('<h1>Exact key</h1>');
  });

  it('rejects a dot path that does not resolve', async () => {
    const fs = fixture({
      '/pages/index.yaml': '---\n_bind:\n  app: prerender.explore.heading\n---\n- h1: ${app}'
    });

    await expect(builder(fs)()).rejects.toThrow('Invalid _bind in /pages/index.yaml for "app": global data key "prerender.explore.heading" not found.');
  });

  it.each(['prerender.', '.stories', 'prerender..stories'])('rejects a dot path with an empty segment: %s', async (sourcePath) => {
    const fs = fixture({
      '/pages/index.yaml': `---\n_bind:\n  app: "${sourcePath}"\n---\n- p: \${app}`
    });

    await expect(builder(fs)()).rejects.toThrow(`global data key "${sourcePath}" not found.`);
  });
});
