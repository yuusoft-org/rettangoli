import { describe, expect, it } from 'vitest';
import * as sites from '../src/index.js';

describe('package exports', () => {
  it('exposes createRtglMarkdown and rtglMarkdown', () => {
    expect(typeof sites.createRtglMarkdown).toBe('function');
    expect(typeof sites.rtglMarkdown).toBe('function');
    expect(sites.createRtglMarkdown).toBe(sites.rtglMarkdown);
  });

  it('exposes built-in asset registry reader', () => {
    expect(typeof sites.readBuiltinAssetRegistry).toBe('function');
  });

  it('exposes built-in asset checker', () => {
    expect(typeof sites.checkBuiltinAssets).toBe('function');
  });

  it('exposes site usage checker', () => {
    expect(typeof sites.checkSiteUsage).toBe('function');
  });
});
