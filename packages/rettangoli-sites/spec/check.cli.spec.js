import { describe, expect, it } from 'vitest';
import { checkSite } from '../src/cli/check.js';

function createMemoryStream() {
  const chunks = [];
  return {
    write(value) {
      chunks.push(String(value));
    },
    toString() {
      return chunks.join('');
    }
  };
}

describe('sites CLI check', () => {
  it('defaults to the built-ins scope when no explicit scope flag is provided', async () => {
    const stdout = createMemoryStream();

    await checkSite(
      { stdout },
      {
        checkBuiltinAssetsImpl: () => ({
          ok: true,
          scope: 'builtins',
          summary: {
            schemaVersion: 1,
            totalAssets: 18,
            templates: { total: 5, stable: 5, assetsWithExamples: 5, assetsWithVtCoverage: 4, vtSpecCount: 6 },
            partials: { total: 10, stable: 10, assetsWithExamples: 10, assetsWithVtCoverage: 7, vtSpecCount: 9 },
            runtimeAssets: { total: 2, stable: 2, consumerReferenceCount: 14 },
            themeBundles: { total: 1, stable: 1, classCount: 12, assetsWithVtCoverage: 1, vtSpecCount: 12 }
          }
        })
      }
    );

    expect(stdout.toString()).toContain('Scope: builtins');
  });

  it('prints a text summary for built-in asset checks', async () => {
    const stdout = createMemoryStream();

    const result = await checkSite(
      { builtins: true, stdout },
      {
        checkBuiltinAssetsImpl: () => ({
          ok: true,
          scope: 'builtins',
          summary: {
            schemaVersion: 1,
            totalAssets: 18,
            templates: { total: 5, stable: 5, assetsWithExamples: 5, assetsWithVtCoverage: 4, vtSpecCount: 6 },
            partials: { total: 10, stable: 10, assetsWithExamples: 10, assetsWithVtCoverage: 7, vtSpecCount: 9 },
            runtimeAssets: { total: 2, stable: 2, consumerReferenceCount: 14 },
            themeBundles: { total: 1, stable: 1, classCount: 12, assetsWithVtCoverage: 1, vtSpecCount: 12 }
          }
        })
      }
    );

    expect(result.ok).toBe(true);
    expect(result.scopes).toEqual(['builtins']);
    expect(stdout.toString()).toContain('Sites check: OK');
    expect(stdout.toString()).toContain('Scope: builtins');
    expect(stdout.toString()).toContain('Templates: 5 total, 5 stable');
  });

  it('prints a text summary for consumer site validation', async () => {
    const stdout = createMemoryStream();

    const result = await checkSite(
      { site: true, rootDir: '/tmp/example-site', stdout },
      {
        checkSiteUsageImpl: async () => ({
          ok: true,
          scope: 'site',
          rootDir: '/tmp/example-site',
          summary: {
            totalPages: 3,
            validatedPages: 2,
            skippedPages: 1,
            skippedByReason: {
              'local-template': 1
            }
          },
          pages: {
            validated: [
              { pagePath: '/pages/index.md', builtinTemplateId: 'docs' },
              { pagePath: '/pages/blog.md', builtinTemplateId: 'blog-article-list' }
            ],
            skipped: [
              { pagePath: '/pages/custom.md', reason: 'local-template' }
            ]
          }
        })
      }
    );

    expect(result.scopes).toEqual(['site']);
    expect(stdout.toString()).toContain('Scope: site');
    expect(stdout.toString()).toContain('Pages: 3 total, 2 validated, 1 skipped');
    expect(stdout.toString()).toContain('Validated templates: blog-article-list(1), docs(1)');
    expect(stdout.toString()).toContain('Skipped pages: local-template=1');
  });

  it('prints machine-readable JSON when requested', async () => {
    const stdout = createMemoryStream();

    await checkSite(
      { builtins: true, format: 'json', stdout },
      {
        checkBuiltinAssetsImpl: () => ({
          ok: true,
          scope: 'builtins',
          summary: { schemaVersion: 1, totalAssets: 1 }
        })
      }
    );

    expect(JSON.parse(stdout.toString())).toEqual({
      ok: true,
      scopes: ['builtins'],
      checks: {
        builtins: {
          ok: true,
          scope: 'builtins',
          summary: { schemaVersion: 1, totalAssets: 1 }
        }
      }
    });
  });

  it('rejects unsupported output formats', async () => {
    await expect(checkSite({ builtins: true, format: 'yaml' })).rejects.toThrow(
      'Unsupported sites check format "yaml". Allowed formats: text, json.'
    );
  });

  it('rejects empty scope selection', async () => {
    await expect(checkSite({ builtins: false, site: false })).rejects.toThrow(
      'No site checks selected. Use --builtins and/or --site.'
    );
  });
});
