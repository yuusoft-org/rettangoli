import { describe, expect, it } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';

describe('builtin template functions', () => {
  it('provides uri/json/date helpers by default', async () => {
    const vol = new Volume();
    const memfs = createFsFromVolume(vol);

    vol.fromJSON({
      '/data/site.yaml': 'meta:\n  name: Rettangoli\n  version: 1\n',
      '/templates/base.yaml': '- html:\n    - body:\n        - "${content}"\n',
      '/pages/index.yaml': [
        '---',
        'template: base',
        '---',
        '- p id="enc-uri-component": "${encodeURIComponent(\'a b/c?d=e\')}"',
        '- p id="json-compact": "${jsonStringify(site.meta)}"',
        '- p id="json-pretty": "${jsonStringify(site.meta, 2)}"',
        '- p id="date-custom": "${formatDate(\'2024-03-15T13:45:09Z\', \'YYYY/MM/DD HH:mm:ss\')}"',
        '- p id="date-compact": "${formatDate(\'2024-03-15T13:45:09Z\', \'YYYYMMDDHHmmss\')}"'
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
  });
});
