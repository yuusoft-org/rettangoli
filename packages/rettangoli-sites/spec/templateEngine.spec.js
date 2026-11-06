import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';

// Users install jempl 0.3.2 through the `^0.3.1-rc1` range. The workspace must build and test
// with the same version, not the 0.3.1-rc1 prerelease.
const requireFromSrc = createRequire(new URL('../src/createSiteBuilder.js', import.meta.url));

const build = async (body) => {
  const vol = new Volume();
  const memfs = createFsFromVolume(vol);
  vol.fromJSON({
    '/pages/index.yaml': [
      '---',
      'posts:', '  - n: 1', '  - n: 2', '  - n: 3', '  - n: 4', '  - n: 5',
      'flag: true',
      'count: 2',
      'labels:', '  a-b: hit',
      '---',
      body,
    ].join('\n'),
  });
  await createSiteBuilder({ fs: memfs, rootDir: '/', outputPath: 'dist', quiet: true })();
  return memfs.readFileSync('/dist/index.html', 'utf8');
};

describe('template engine (jempl)', () => {
  it('resolves jempl >=0.3.2 <0.4.0 from src', () => {
    const { version } = requireFromSrc('jempl/package.json');
    const [major, minor, patch] = version.split(/[.-]/).map(Number);
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(major).toBe(0);
    expect(minor).toBe(3);
    expect(patch).toBeGreaterThanOrEqual(2);
  });

  it('evaluates a function call on the right of < in $if (blog-cards pattern)', async () => {
    const html = await build('- div:\n    - $for item, i in sort(posts, "n", "desc"):\n        - $if i < default(postLimit, 3):\n            - p: x${item.n}');
    expect(html).toBe('<div><p>x5</p><p>x4</p><p>x3</p></div>');
  });

  it('evaluates a function call as the whole $if condition', async () => {
    expect(await build('- div:\n    - $if default(flag, false):\n        - p: on')).toBe('<div><p>on</p></div>');
  });

  it('evaluates a negated function call in $if', async () => {
    expect(await build('- div:\n    - $if !default(flag, false):\n        - p: on')).toBe('<div></div>');
  });

  // Other template-visible changes between 0.3.1-rc1 and 0.3.2.
  it('keeps both sides of a condition wrapped in separate parentheses', async () => {
    expect(await build('- div:\n    - $if (flag) && (count > 1):\n        - p: on')).toBe('<div><p>on</p></div>');
  });

  it('supports + and - in conditions and function arguments', async () => {
    expect(await build('- div:\n    - $if count + 1 > 2:\n        - p: on')).toBe('<div><p>on</p></div>');
    expect(await build('- div:\n    - p: ${default(count - 1, 0)}')).toBe('<div><p>1</p></div>');
  });

  it('reads a quoted bracket key', async () => {
    expect(await build('- div:\n    - p: ${labels["a-b"]}')).toBe('<div><p>hit</p></div>');
  });
});
