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

  it('keeps screenshotCommand as a stub that rejects with the migration message', async () => {
    const error = await cli.screenshotCommand().catch((reason) => reason);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Screenshot CLI for @rettangoli/sites was removed. Use "rtgl vt generate" with "vt.url" and optional "vt.service.start".');
  });
});
