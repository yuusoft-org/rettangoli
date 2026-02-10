import { describe, expect, it } from 'vitest';
import * as sites from '../src/index.js';

describe('package exports', () => {
  it('exposes createRtglMarkdown and rtglMarkdown', () => {
    expect(typeof sites.createRtglMarkdown).toBe('function');
    expect(typeof sites.rtglMarkdown).toBe('function');
    expect(sites.createRtglMarkdown).toBe(sites.rtglMarkdown);
  });
});
