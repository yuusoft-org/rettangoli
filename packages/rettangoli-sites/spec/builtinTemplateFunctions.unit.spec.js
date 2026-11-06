import { describe, expect, it, vi, afterEach } from 'vitest';
import { builtinTemplateFunctions } from '../src/builtinTemplateFunctions.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('builtinTemplateFunctions unit', () => {
  it('encodes and decodes URI values', () => {
    expect(builtinTemplateFunctions.encodeURI('https://a.com/a b?x=1&y=2')).toBe('https://a.com/a%20b?x=1&y=2');
    expect(builtinTemplateFunctions.encodeURIComponent('a b/c?d=e')).toBe('a%20b%2Fc%3Fd%3De');
    expect(builtinTemplateFunctions.decodeURI('https://a.com/a%20b?x=1&y=2')).toBe('https://a.com/a b?x=1&y=2');
    expect(builtinTemplateFunctions.decodeURIComponent('a%20b%2Fc%3Fd%3De')).toBe('a b/c?d=e');
  });

  it('returns original input for malformed decode values', () => {
    expect(builtinTemplateFunctions.decodeURI('%E0%A4%A')).toBe('%E0%A4%A');
    expect(builtinTemplateFunctions.decodeURIComponent('%E0%A4%A')).toBe('%E0%A4%A');
  });

  it('stringifies JSON with clamped indentation and undefined safety', () => {
    expect(builtinTemplateFunctions.jsonStringify({ a: 1 })).toBe('{"a":1}');
    expect(builtinTemplateFunctions.jsonStringify({ a: 1 }, 2)).toBe('{\n  "a": 1\n}');
    expect(builtinTemplateFunctions.jsonStringify({ a: 1 }, 999)).toBe('{\n          "a": 1\n}');
    expect(builtinTemplateFunctions.jsonStringify(undefined)).toBe('');
  });

  it('formats dates with tokens in UTC by default', () => {
    expect(
      builtinTemplateFunctions.formatDate('2024-03-15T13:45:09Z', 'YYYY/MM/DD HH:mm:ss')
    ).toBe('2024/03/15 13:45:09');
    expect(
      builtinTemplateFunctions.formatDate('2024-03-15T13:45:09Z', 'YYYYMMDDHHmmss')
    ).toBe('20240315134509');
    expect(
      builtinTemplateFunctions.formatDate('2025-01-05T00:00:00Z', 'MMM D, YYYY')
    ).toBe('Jan 5, 2025');
  });

  it('returns empty string for invalid date input', () => {
    expect(builtinTemplateFunctions.formatDate('not-a-date')).toBe('');
  });

  it('formats now() using the supplied format', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T01:02:03Z'));
    expect(builtinTemplateFunctions.now('YYYY-MM-DD HH:mm:ss')).toBe('2026-02-10 01:02:03');
  });

  it('builds query strings and supports array values', () => {
    expect(
      builtinTemplateFunctions.toQueryString({
        q: 'hello world',
        page: 2,
        tags: ['a', 'b'],
        skip: null
      })
    ).toBe('q=hello+world&page=2&tags=a&tags=b');
  });

  it('sorts a list by key and order', () => {
    const list = [
      { version: '1.0.0-rc12', publishedAt: '2026-02-10T09:00:00Z' },
      { version: '1.0.0-rc11', publishedAt: '2026-02-08T09:00:00Z' },
      { version: '1.0.0-rc13', publishedAt: '2026-02-11T09:00:00Z' },
    ];

    expect(builtinTemplateFunctions.sort(list, 'publishedAt', 'desc').map((item) => item.version))
      .toEqual(['1.0.0-rc13', '1.0.0-rc12', '1.0.0-rc11']);
    expect(builtinTemplateFunctions.sort(list, 'publishedAt', 'asc').map((item) => item.version))
      .toEqual(['1.0.0-rc11', '1.0.0-rc12', '1.0.0-rc13']);
  });

  it('sorts a list by nested dot-path key', () => {
    const list = [
      { data: { version: '1.0.0-rc12', date: '2026-02-10T09:00:00Z' } },
      { data: { version: '1.0.0-rc11', date: '2026-02-08T09:00:00Z' } },
      { data: { version: '1.0.0-rc13', date: '2026-02-11T09:00:00Z' } },
    ];

    expect(builtinTemplateFunctions.sort(list, 'data.date', 'desc').map((item) => item.data.version))
      .toEqual(['1.0.0-rc13', '1.0.0-rc12', '1.0.0-rc11']);
    expect(builtinTemplateFunctions.sort(list, 'data.date', 'asc').map((item) => item.data.version))
      .toEqual(['1.0.0-rc11', '1.0.0-rc12', '1.0.0-rc13']);
  });

  it('sorts numbers numerically', () => {
    const wrap = (values) => values.map((n) => ({ n }));
    const pick = (list) => list.map((item) => item.n);

    expect(pick(builtinTemplateFunctions.sort(wrap([2001, 3, 13]), 'n'))).toEqual([3, 13, 2001]);
    expect(pick(builtinTemplateFunctions.sort(wrap([13, 2001, 3]), 'n', 'desc'))).toEqual([2001, 13, 3]);
    expect(pick(builtinTemplateFunctions.sort(wrap([49, 50, 3, 100]), 'n'))).toEqual([3, 49, 50, 100]);
    expect(builtinTemplateFunctions.sort([20, 3, 50])).toEqual([3, 20, 50]);
  });

  it('keeps null and missing values last in both orders', () => {
    const list = [{ n: null }, { n: 2 }, {}, { n: 10 }];

    expect(builtinTemplateFunctions.sort(list, 'n').map((item) => item.n)).toEqual([2, 10, null, undefined]);
    expect(builtinTemplateFunctions.sort(list, 'n', 'desc').map((item) => item.n)).toEqual([10, 2, null, undefined]);
  });

  it('keeps sorting ISO date strings and plain titles as before', () => {
    const dates = ['2026-02-10', '2025-12-18', '2026-10-31T08:00:00Z', '2026-10-31'];
    expect(builtinTemplateFunctions.sort(dates, undefined, 'desc'))
      .toEqual(['2026-10-31T08:00:00Z', '2026-10-31', '2026-02-10', '2025-12-18']);
    expect(builtinTemplateFunctions.sort(['banana', 'Cherry', 'apple'])).toEqual(['apple', 'banana', 'Cherry']);
  });

  it('chunks arrays into fixed-size rows and can pad the last row', () => {
    const items = [1, 2, 3, 4, 5];

    expect(builtinTemplateFunctions.chunk(items, 3)).toEqual([
      [1, 2, 3],
      [4, 5],
    ]);
    expect(builtinTemplateFunctions.chunk(items, 3, true)).toEqual([
      [1, 2, 3],
      [4, 5, null],
    ]);
    expect(builtinTemplateFunctions.chunk(items, 3, true, '__empty__')).toEqual([
      [1, 2, 3],
      [4, 5, '__empty__'],
    ]);
  });

  it('returns [] for invalid chunk inputs', () => {
    expect(builtinTemplateFunctions.chunk(null, 3)).toEqual([]);
    expect(builtinTemplateFunctions.chunk([1, 2, 3], 0)).toEqual([]);
    expect(builtinTemplateFunctions.chunk([1, 2, 3], Number.NaN)).toEqual([]);
  });

  it('renders markdown to raw html payload', () => {
    expect(builtinTemplateFunctions.md('**hello**')).toEqual({
      __html: '<p><strong>hello</strong></p>\n',
    });
  });

  it('returns fallback values only for nullish or empty-string inputs', () => {
    expect(builtinTemplateFunctions.default(undefined, 'fallback')).toBe('fallback');
    expect(builtinTemplateFunctions.default(null, 'fallback')).toBe('fallback');
    expect(builtinTemplateFunctions.default('', 'fallback')).toBe('fallback');
    expect(builtinTemplateFunctions.default(false, 'fallback')).toBe(false);
    expect(builtinTemplateFunctions.default(0, 'fallback')).toBe(0);
    expect(builtinTemplateFunctions.default('value', 'fallback')).toBe('value');
  });
});
