import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadSiteConfig } from '../src/utils/loadSiteConfig.js';

async function withTempDir(fn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rtgl-sites-config-'));
  try {
    return await fn(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

describe('loadSiteConfig', () => {
  it('loads markdownit options from sites.config.yaml', async () => {
    await withTempDir(async (tempDir) => {
      fs.writeFileSync(
        path.join(tempDir, 'sites.config.yaml'),
        [
          'markdownit:',
          '  preset: commonmark',
          '  html: false',
          '  xhtmlOut: true',
          '  linkify: false',
          '  typographer: true',
          '  breaks: true',
          '  langPrefix: code-',
          '  quotes: "\\"\\"\'\'"',
          '  maxNesting: 20',
          '  shiki:',
          '    enabled: true',
          '    theme: github-dark',
          '  headingAnchors: false'
        ].join('\n')
      );

      const config = await loadSiteConfig(tempDir);
      expect(config).toEqual({
        markdown: {
          preset: 'commonmark',
          html: false,
          xhtmlOut: true,
          linkify: false,
          typographer: true,
          breaks: true,
          langPrefix: 'code-',
          quotes: `""''`,
          maxNesting: 20,
          shiki: {
            enabled: true,
            theme: 'github-dark'
          },
          headingAnchors: false
        }
      });
    });
  });

  it('supports legacy markdown key as alias', async () => {
    await withTempDir(async (tempDir) => {
      fs.writeFileSync(path.join(tempDir, 'sites.config.yaml'), 'markdown:\n  html: true\n');

      const config = await loadSiteConfig(tempDir);
      expect(config).toEqual({
        markdown: {
          html: true
        }
      });
    });
  });

  it('supports sites.config.yml', async () => {
    await withTempDir(async (tempDir) => {
      fs.writeFileSync(path.join(tempDir, 'sites.config.yml'), 'markdownit:\n  html: true\n');

      const config = await loadSiteConfig(tempDir);
      expect(config).toEqual({
        markdown: {
          html: true
        }
      });
    });
  });

  it('throws when both markdown and markdownit are present', async () => {
    await withTempDir(async (tempDir) => {
      fs.writeFileSync(path.join(tempDir, 'sites.config.yaml'), 'markdown:\n  html: true\nmarkdownit:\n  html: true\n');
      await expect(loadSiteConfig(tempDir)).rejects.toThrow('Use only one of "markdown" or "markdownit"');
    });
  });

  it('throws when legacy sites.config.js is present', async () => {
    await withTempDir(async (tempDir) => {
      fs.writeFileSync(path.join(tempDir, 'sites.config.js'), 'export default {};');

      await expect(loadSiteConfig(tempDir)).rejects.toThrow('no longer supported');
    });
  });
});
