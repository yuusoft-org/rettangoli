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
});
