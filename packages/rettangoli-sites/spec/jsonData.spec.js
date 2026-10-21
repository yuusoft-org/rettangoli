import { describe, expect, it, vi } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';

const response = (text) => ({ ok: true, text: async () => text });

function fixture(files = {}) {
  return createFsFromVolume(Volume.fromJSON({
    '/pages/index.yaml': '- p: ${catalog.title}',
    ...files
  }));
}

function builder(fs, options = {}) {
  return createSiteBuilder({ fs, rootDir: '/', quiet: true, ...options });
}

describe('JSON data files', () => {
  it('loads data/*.json under its file name like YAML data', async () => {
    const fs = fixture({
      '/data/catalog.json': JSON.stringify({ title: 'Library', stories: [{ id: 'first', title: 'First Story' }] }),
      '/data/site.yaml': 'name: Example Site',
      '/pages/index.yaml': '---\n_bind:\n  firstStory: catalog.stories.0\n---\n- p: ${catalog.title} / ${site.name} / ${firstStory.title}',
      '/pages/story.yaml': '---\n_each:\n  data: catalog.stories\n  as: story\n  url: /vn/${story.id}/\n---\n- h1: ${story.title}'
    });

    await builder(fs)();

    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain('<p>Library / Example Site / First Story</p>');
    expect(fs.readFileSync('/_site/vn/first/index.html', 'utf8')).toContain('<h1>First Story</h1>');
  });

  it('supports a JSON array, string, and number just like YAML data', async () => {
    const fs = fixture({
      '/data/list.json': '["One", "Two"]',
      '/data/label.json': '"Hello"',
      '/data/count.json': '42',
      '/pages/index.yaml': '- div:\n    - $for item in list:\n        - p: ${item}\n    - p: ${label} ${count}'
    });

    await builder(fs)();

    const html = fs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('<p>Two</p>');
    expect(html).toContain('<p>Hello 42</p>');
  });

  it('prefers JSON file data over inline config on key conflicts', async () => {
    const fs = fixture({ '/data/catalog.json': '{"title": "File"}' });

    await builder(fs, { data: { catalog: { title: 'Inline' } } })();

    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain('<p>File</p>');
  });

  it.each(['yaml', 'yml'])('rejects data/<name>.json together with data/<name>.%s', async (extension) => {
    const fs = fixture({
      '/data/catalog.json': '{"title": "JSON"}',
      [`/data/catalog.${extension}`]: 'title: YAML'
    });

    await expect(builder(fs)()).rejects.toThrow(
      `Conflicting data files "/data/catalog.json" and "/data/catalog.${extension}": both define global data key "catalog". Keep only one of them.`
    );
    expect(fs.existsSync('/_site')).toBe(false);
  });

  it('rejects invalid JSON with the file path', async () => {
    const fs = fixture({ '/data/catalog.json': '{"title": ' });

    await expect(builder(fs)()).rejects.toThrow('data file "/data/catalog.json": Invalid JSON:');
  });

  it('lets a local JSON file replace the entire remote alias, but still fetches it', async () => {
    const fs = fixture({
      '/data/catalog.json': '{"title": "Local"}',
      '/pages/index.yaml': '- p: ${catalog.title} / ${default(catalog.remoteOnly, "Absent")}'
    });
    const fetchImpl = vi.fn(async () => response('title: Remote\nremoteOnly: Remote field'));

    await builder(fs, { imports: { data: { catalog: 'https://example.com/catalog.yaml' } }, fetchImpl })();

    expect(fs.readFileSync('/_site/index.html', 'utf8')).toContain('<p>Local / Absent</p>');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
