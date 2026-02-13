import { describe, expect, it } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';

describe('builtin template functions', () => {
  it('provides uri/json/date helpers by default', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/data/site.yaml': 'meta:\n  name: Rettangoli\n  version: 1\n',
      '/data/releases.yaml': [
        'items:',
        '  - version: "1.0.0-rc11"',
        '    publishedAt: "2026-02-08T09:00:00Z"',
        '  - version: "1.0.0-rc13"',
        '    publishedAt: "2026-02-11T09:00:00Z"',
        '  - version: "1.0.0-rc12"',
        '    publishedAt: "2026-02-10T09:00:00Z"'
      ].join('\n'),
      '/data/posts.yaml': [
        'items:',
        '  - data:',
        '      version: "post-2"',
        '      date: "2026-02-10T09:00:00Z"',
        '  - data:',
        '      version: "post-1"',
        '      date: "2026-02-08T09:00:00Z"',
        '  - data:',
        '      version: "post-3"',
        '      date: "2026-02-11T09:00:00Z"'
      ].join('\n'),
      '/templates/base.yaml': '- html:\n    - body:\n        - "${content}"\n',
      '/pages/index.yaml': [
        '---',
        'template: base',
        '---',
        '- p id="enc-uri-component": "${encodeURIComponent(\'a b/c?d=e\')}"',
        '- p id="json-compact": "${jsonStringify(site.meta)}"',
        '- p id="json-pretty": "${jsonStringify(site.meta, 2)}"',
        '- p id="date-custom": "${formatDate(\'2024-03-15T13:45:09Z\', \'YYYY/MM/DD HH:mm:ss\')}"',
        '- p id="date-compact": "${formatDate(\'2024-03-15T13:45:09Z\', \'YYYYMMDDHHmmss\')}"',
        '- p id="sorted-latest": "${jsonStringify(sort(releases.items, \'publishedAt\', \'desc\'))}"',
        '- p id="sorted-nested-latest": "${jsonStringify(sort(posts.items, \'data.date\', \'desc\'))}"',
        '- div id="md-snippet": "${md(\'**Hello**\')}"'
      ].join('\n'),
    });

    const build = createSiteBuilder({
      fs: memfs,
      rootDir: '/',
      quiet: true
    });
    await build();

    const html = memfs.readFileSync('/_site/index.html', 'utf8');
    expect(html).toContain('a%20b%2Fc%3Fd%3De');
    expect(html).toContain('{&quot;name&quot;:&quot;Rettangoli&quot;,&quot;version&quot;:1}');
    expect(html).toContain('&quot;name&quot;: &quot;Rettangoli&quot;');
    expect(html).toContain('2024/03/15 13:45:09');
    expect(html).toContain('20240315134509');
    expect(html).toContain('<p id="sorted-latest">[{&quot;version&quot;:&quot;1.0.0-rc13&quot;');
    expect(html).toContain('<p id="sorted-nested-latest">[{&quot;data&quot;:{&quot;version&quot;:&quot;post-3&quot;');
    expect(html).toContain('<div id="md-snippet"><p><strong>Hello</strong></p>');
  });
});
