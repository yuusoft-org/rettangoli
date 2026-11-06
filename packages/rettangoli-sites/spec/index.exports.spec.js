import { describe, expect, it } from 'vitest';
import * as sites from '../src/index.js';
import * as cli from '../src/cli/index.js';
import * as watchClient from '../src/cli/watchClient.js';

describe('package exports', () => {
  it('exposes createRtglMarkdown and rtglMarkdown', () => {
    expect(typeof sites.createRtglMarkdown).toBe('function');
    expect(typeof sites.rtglMarkdown).toBe('function');
    expect(sites.createRtglMarkdown).toBe(sites.rtglMarkdown);
  });

  it('exports exactly these names from ".", "./cli" and "./watch-client"', () => {
    expect(Object.keys(sites).sort()).toEqual(['createRtglMarkdown', 'createSiteBuilder', 'rtglMarkdown']);
    expect(Object.keys(cli).sort()).toEqual(['buildSite', 'initSite', 'screenshotCommand', 'watchSite']);
    expect(Object.keys(watchClient).sort()).toEqual(['createViteWatchClientModuleSource', 'createWatchClientScript']);
  });
});
