import { describe, expect, it } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { checkSiteUsage } from '../src/checkSiteUsage.js';

function createMemfsSite(files) {
  const volume = new Volume();
  volume.fromJSON(files);
  return createFsFromVolume(volume);
}

describe('checkSiteUsage', () => {
  it('validates pages that consume built-in imported templates', async () => {
    const memfs = createMemfsSite({
      '/data/site.yaml': [
        'baseUrl: https://example.com',
        'navbar:',
        '  brand:',
        '    label: Example',
        '    href: /',
        '  items:',
        '    - label: Docs',
        '      href: /docs/',
        'footer:',
        '  brand:',
        '    label: Example',
        '    tagline: Example docs',
        '  columns:',
        '    - title: Product',
        '      links:',
        '        - label: Docs',
        '          href: /docs/',
        '  legalLinks:',
        '    - label: Privacy',
        '      href: /privacy',
        '  copyright: Example Inc.'
      ].join('\n'),
      '/data/seo.yaml': [
        'title: Example Docs',
        'description: Example documentation site',
        'ogSiteName: Example',
        'ogType: article'
      ].join('\n'),
      '/data/docs.yaml': [
        'header:',
        '  label: Example Docs',
        '  href: /docs/',
        'items:',
        '  - title: Getting Started',
        '    href: /docs/getting-started/'
      ].join('\n'),
      '/pages/docs/getting-started.md': [
        '---',
        'template: docs',
        'title: Getting Started',
        'sidebarId: docs-getting-started',
        '_bind:',
        '  docs: docs',
        '  seo: seo',
        '---',
        '# Hello'
      ].join('\n')
    });

    const result = await checkSiteUsage({
      rootDir: '/',
      fsImpl: memfs,
      loadSiteConfigImpl: async () => ({
        imports: {
          templates: {
            docs: 'https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc13/sites/templates/docs.yaml'
          }
        }
      })
    });

    expect(result.ok).toBe(true);
    expect(result.scope).toBe('site');
    expect(result.summary.totalPages).toBe(1);
    expect(result.summary.validatedPages).toBe(1);
    expect(result.summary.skippedPages).toBe(0);
    expect(result.pages.validated[0]).toMatchObject({
      pagePath: '/pages/docs/getting-started.md',
      template: 'docs',
      builtinTemplateId: 'docs'
    });
  });

  it('fails with page-specific schema errors when required template data is missing', async () => {
    const memfs = createMemfsSite({
      '/data/site.yaml': [
        'baseUrl: https://example.com',
        'navbar:',
        '  brand:',
        '    label: Example',
        '    href: /',
        '  items:',
        '    - label: Docs',
        '      href: /docs/',
        'footer:',
        '  brand:',
        '    label: Example',
        '    tagline: Example docs',
        '  columns:',
        '    - title: Product',
        '      links:',
        '        - label: Docs',
        '          href: /docs/',
        '  legalLinks:',
        '    - label: Privacy',
        '      href: /privacy',
        '  copyright: Example Inc.'
      ].join('\n'),
      '/data/seo.yaml': [
        'title: Example Docs',
        'description: Example documentation site',
        'ogSiteName: Example',
        'ogType: article'
      ].join('\n'),
      '/data/docs.yaml': [
        'header:',
        '  label: Example Docs',
        '  href: /docs/',
        'items:',
        '  - title: Getting Started',
        '    href: /docs/getting-started/'
      ].join('\n'),
      '/pages/docs/getting-started.md': [
        '---',
        'template: docs',
        'title: Getting Started',
        '_bind:',
        '  docs: docs',
        '  seo: seo',
        '---',
        '# Hello'
      ].join('\n')
    });

    await expect(checkSiteUsage({
      rootDir: '/',
      fsImpl: memfs,
      loadSiteConfigImpl: async () => ({
        imports: {
          templates: {
            docs: 'https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc13/sites/templates/docs.yaml'
          }
        }
      })
    })).rejects.toThrow(`/pages/docs/getting-started.md (docs -> docs)`);

    await expect(checkSiteUsage({
      rootDir: '/',
      fsImpl: memfs,
      loadSiteConfigImpl: async () => ({
        imports: {
          templates: {
            docs: 'https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc13/sites/templates/docs.yaml'
          }
        }
      })
    })).rejects.toThrow(`must have required property 'sidebarId'`);
  });

  it('skips pages backed by local templates instead of forcing built-in validation', async () => {
    const memfs = createMemfsSite({
      '/templates/custom.yaml': '- div: custom',
      '/pages/custom.md': [
        '---',
        'template: custom',
        'title: Custom',
        '---',
        '# Custom'
      ].join('\n')
    });

    const result = await checkSiteUsage({
      rootDir: '/',
      fsImpl: memfs,
      loadSiteConfigImpl: async () => ({
        imports: {
          templates: {
            custom: 'https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc13/sites/templates/base.yaml'
          }
        }
      })
    });

    expect(result.summary.validatedPages).toBe(0);
    expect(result.summary.skippedPages).toBe(1);
    expect(result.summary.skippedByReason).toEqual({
      'local-template': 1
    });
  });
});
