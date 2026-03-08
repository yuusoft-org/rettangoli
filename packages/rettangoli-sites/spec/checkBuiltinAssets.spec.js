import { describe, expect, it } from 'vitest';
import { checkBuiltinAssets } from '../src/checkBuiltinAssets.js';
import { readBuiltinAssetRegistry } from '../src/contracts/index.js';

function countByStability(entries, stability) {
  return entries.filter((entry) => entry.stability === stability).length;
}

describe('checkBuiltinAssets', () => {
  it('summarizes the published built-in asset surface from the registry', () => {
    const result = checkBuiltinAssets();
    const { registry } = readBuiltinAssetRegistry();

    expect(result.ok).toBe(true);
    expect(result.scope).toBe('builtins');
    expect(result.summary.schemaVersion).toBe(registry.schemaVersion);
    expect(result.summary.totalAssets).toBe(
      registry.templates.length
      + registry.partials.length
      + registry.runtimeAssets.length
      + registry.themeBundles.length
    );

    expect(result.summary.templates.total).toBe(registry.templates.length);
    expect(result.summary.templates.stable).toBe(countByStability(registry.templates, 'stable'));
    expect(result.summary.templates.assetsWithExamples).toBe(registry.templates.length);

    expect(result.summary.partials.total).toBe(registry.partials.length);
    expect(result.summary.partials.stable).toBe(countByStability(registry.partials, 'stable'));

    expect(result.summary.runtimeAssets.total).toBe(registry.runtimeAssets.length);
    expect(result.summary.runtimeAssets.stable).toBe(countByStability(registry.runtimeAssets, 'stable'));
    expect(result.summary.runtimeAssets.consumerReferenceCount).toBeGreaterThan(0);

    expect(result.summary.themeBundles.total).toBe(registry.themeBundles.length);
    expect(result.summary.themeBundles.stable).toBe(countByStability(registry.themeBundles, 'stable'));
    expect(result.summary.themeBundles.classCount).toBeGreaterThan(0);
  });
});
