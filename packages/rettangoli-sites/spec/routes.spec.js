import { describe, expect, it } from 'vitest';
import {
  derivePageUrlFromRelativePath,
  htmlOutputRelativePathFromUrl,
  markdownOutputRelativePathFromUrl,
  normalizePageUrlOverride,
  normalizeSitePath,
  resolvePageUrl
} from '../src/routes.js';

describe('normalizeSitePath', () => {
  it.each([
    ['/', '/'],
    ['about', '/about/'],
    ['/about', '/about/'],
    ['/about/', '/about/'],
    ['docs//intro///', '/docs/intro/'],
    ['/index.html', '/index.html/'],
    ['/%E6%97%A5%E6%9C%AC', '/%E6%97%A5%E6%9C%AC/'],
    ['/日本/', '/日本/'],
    ['/a.b/c-d_e~f/', '/a.b/c-d_e~f/'],
    ['/...', '/.../']
  ])('normalizes %j to %j', (raw, expected) => {
    expect(normalizeSitePath(raw, 'Label')).toBe(expected);
  });

  it.each([
    [42, 'expected a string.'],
    ['', 'expected a non-empty string.'],
    ['/a\u0007b', 'must not contain control characters.'],
    ['/a b', 'must not contain whitespace.'],
    ['/a\u00a0b', 'must not contain whitespace.'],
    ['https://example.com/x', 'expected a site-relative URL path.'],
    ['mailto:a@b.c', 'expected a site-relative URL path.'],
    ['//example.com/x', 'expected a site-relative URL path.'],
    ['\\a', 'must use forward slashes.'],
    ['/a?b=1', 'must not include query strings or fragments.'],
    ['/a#b', 'must not include query strings or fragments.'],
    ['/a/%zz', 'contains invalid URL encoding.'],
    ['/a/../b', 'must not contain "." or ".." segments.'],
    ['./a', 'must not contain "." or ".." segments.'],
    ['/a/%2e%2E/b', 'must not contain "." or ".." segments.'],
    ['/a%2Fb', 'must not include encoded slashes or backslashes.'],
    ['/a%5Cb', 'must not include encoded slashes or backslashes.'],
    ['/a%07b', 'must not contain control characters.'],
    ['/a%20b', 'must not contain whitespace.']
  ])('rejects %j: %s', (raw, reason) => {
    expect(() => normalizeSitePath(raw, 'Label')).toThrow(new Error(`Label: ${reason}`));
  });
});

describe('page URLs', () => {
  it('labels url frontmatter errors with the page path', () => {
    expect(normalizePageUrlOverride('/docs', '/pages/a.md')).toBe('/docs/');
    expect(() => normalizePageUrlOverride('/a?b', '/pages/a.md'))
      .toThrow(new Error('Invalid url in /pages/a.md: must not include query strings or fragments.'));
    expect(() => normalizePageUrlOverride(null, '/pages/a.md (_each item 0)'))
      .toThrow(new Error('Invalid url in /pages/a.md (_each item 0): expected a string.'));
  });

  it.each([
    ['index.yaml', '/'],
    ['index.md', '/'],
    ['about.yml', '/about/'],
    ['docs/index.md', '/docs/'],
    ['docs/intro.md', '/docs/intro/'],
    ['docs\\guide\\index.yaml', '/docs/guide/'],
    ['blog/2024.01.yaml', '/blog/2024.01/'],
    ['notes.md.md', '/notes.md/'],
    ['blog/my-index.yaml', '/blog/my-index/']
  ])('derives %j from the file path as %j', (relativePath, expected) => {
    expect(derivePageUrlFromRelativePath(relativePath)).toBe(expected);
  });

  it('uses the url frontmatter key when it is present, even when it is not a string', () => {
    expect(resolvePageUrl({ url: 'custom' }, 'docs/a.md', '/pages/docs/a.md')).toBe('/custom/');
    expect(resolvePageUrl({ title: 'x' }, 'docs/a.md', '/pages/docs/a.md')).toBe('/docs/a/');
    expect(() => resolvePageUrl({ url: undefined }, 'docs/a.md', '/pages/docs/a.md'))
      .toThrow(new Error('Invalid url in /pages/docs/a.md: expected a string.'));
  });

  it.each([
    ['/', 'index.html', 'index.md'],
    ['/about/', 'about/index.html', 'about.md'],
    ['/docs/guide/intro/', 'docs/guide/intro/index.html', 'docs/guide/intro.md']
  ])('writes %j to %j and its markdown copy to %j', (url, html, markdown) => {
    expect(htmlOutputRelativePathFromUrl(url)).toBe(html);
    expect(markdownOutputRelativePathFromUrl(url)).toBe(markdown);
  });
});
