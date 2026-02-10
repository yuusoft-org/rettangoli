import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
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
          '  codePreview:',
          '    enabled: true',
          '    showSource: false',
          '    theme: one-dark-pro',
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
          codePreview: {
            enabled: true,
            showSource: false,
            theme: 'one-dark-pro'
          },
          headingAnchors: false
        }
      });
    });
  });

  it('supports legacy markdown key as alias', async () => {
    await withTempDir(async (tempDir) => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      fs.writeFileSync(path.join(tempDir, 'sites.config.yaml'), 'markdown:\n  html: true\n');

      const config = await loadSiteConfig(tempDir);
      expect(config).toEqual({
        markdown: {
          html: true
        }
      });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('legacy key "markdown"'));
      warnSpy.mockRestore();
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

  it('supports headingAnchors object configuration', async () => {
    await withTempDir(async (tempDir) => {
      fs.writeFileSync(
        path.join(tempDir, 'sites.config.yaml'),
        [
          'markdownit:',
          '  headingAnchors:',
          '    enabled: true',
          '    slugMode: ascii',
          '    wrap: false',
          '    fallback: section'
        ].join('\n')
      );

      const config = await loadSiteConfig(tempDir);
      expect(config).toEqual({
        markdown: {
          headingAnchors: {
            enabled: true,
            slugMode: 'ascii',
            wrap: false,
            fallback: 'section'
          }
        }
      });
    });
  });

  it('throws when both markdown and markdownit are present', async () => {
    await withTempDir(async (tempDir) => {
      fs.writeFileSync(path.join(tempDir, 'sites.config.yaml'), 'markdown:\n  html: true\nmarkdownit:\n  html: true\n');
      await expect(loadSiteConfig(tempDir)).rejects.toThrow('Use only one of "markdownit"');
    });
  });

  it('throws when legacy sites.config.js is present', async () => {
    await withTempDir(async (tempDir) => {
      fs.writeFileSync(path.join(tempDir, 'sites.config.js'), 'export default {};');

      await expect(loadSiteConfig(tempDir)).rejects.toThrow('no longer supported');
    });
  });

  it('throws on invalid headingAnchors.slugMode', async () => {
    await withTempDir(async (tempDir) => {
      fs.writeFileSync(
        path.join(tempDir, 'sites.config.yaml'),
        [
          'markdownit:',
          '  headingAnchors:',
          '    slugMode: transliterate'
        ].join('\n')
      );
      await expect(loadSiteConfig(tempDir)).rejects.toThrow('Invalid headingAnchors slugMode');
    });
  });

  it('throws on invalid codePreview option', async () => {
    await withTempDir(async (tempDir) => {
      fs.writeFileSync(
        path.join(tempDir, 'sites.config.yaml'),
        [
          'markdownit:',
          '  codePreview:',
          '    enabled: yes'
        ].join('\n')
      );
      await expect(loadSiteConfig(tempDir)).rejects.toThrow('Invalid codePreview option "enabled"');
    });
  });

  it('throws on invalid codePreview.showSource type', async () => {
    await withTempDir(async (tempDir) => {
      fs.writeFileSync(
        path.join(tempDir, 'sites.config.yaml'),
        [
          'markdownit:',
          '  codePreview:',
          '    showSource: 1'
        ].join('\n')
      );
      await expect(loadSiteConfig(tempDir)).rejects.toThrow('Invalid codePreview option "showSource"');
    });
  });

  it('throws on empty codePreview.theme', async () => {
    await withTempDir(async (tempDir) => {
      fs.writeFileSync(
        path.join(tempDir, 'sites.config.yaml'),
        [
          'markdownit:',
          '  codePreview:',
          '    theme: ""'
        ].join('\n')
      );
      await expect(loadSiteConfig(tempDir)).rejects.toThrow('Invalid codePreview option "theme"');
    });
  });
});
