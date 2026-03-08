import { readBuiltinAssetRegistry } from './contracts/index.js';

function summarizeByStability(entries) {
  const summary = {
    total: entries.length,
    stable: 0,
    experimental: 0,
    deprecated: 0
  };

  entries.forEach((entry) => {
    if (entry.stability === 'stable') {
      summary.stable += 1;
    } else if (entry.stability === 'experimental') {
      summary.experimental += 1;
    } else if (entry.stability === 'deprecated') {
      summary.deprecated += 1;
    }
  });

  return summary;
}

function countEntriesWithNonEmptyArray(entries, key) {
  return entries.filter((entry) => Array.isArray(entry[key]) && entry[key].length > 0).length;
}

function sumArrayLengths(entries, key) {
  return entries.reduce((total, entry) => {
    if (!Array.isArray(entry[key])) {
      return total;
    }
    return total + entry[key].length;
  }, 0);
}

function summarizePublishedAssets(entries) {
  return {
    ...summarizeByStability(entries),
    assetsWithDocs: countEntriesWithNonEmptyArray(entries, 'docsPaths'),
    assetsWithExamples: countEntriesWithNonEmptyArray(entries, 'examplePaths'),
    assetsWithVtCoverage: countEntriesWithNonEmptyArray(entries, 'vtSpecPaths'),
    vtSpecCount: sumArrayLengths(entries, 'vtSpecPaths')
  };
}

function summarizeRuntimeAssets(entries) {
  return {
    ...summarizeByStability(entries),
    assetsWithDocs: countEntriesWithNonEmptyArray(entries, 'docsPaths'),
    consumerReferenceCount: sumArrayLengths(entries, 'consumedBy')
  };
}

function summarizeThemeBundles(entries) {
  return {
    ...summarizeByStability(entries),
    assetsWithDocs: countEntriesWithNonEmptyArray(entries, 'docsPaths'),
    assetsWithVtCoverage: countEntriesWithNonEmptyArray(entries, 'vtSpecPaths'),
    vtSpecCount: sumArrayLengths(entries, 'vtSpecPaths'),
    classCount: sumArrayLengths(entries, 'classes')
  };
}

export function checkBuiltinAssets(options = {}) {
  const {
    readRegistry = readBuiltinAssetRegistry
  } = options;

  const { registry } = readRegistry();

  const summary = {
    schemaVersion: registry.schemaVersion,
    totalAssets:
      registry.templates.length
      + registry.partials.length
      + registry.runtimeAssets.length
      + registry.themeBundles.length,
    templates: summarizePublishedAssets(registry.templates),
    partials: summarizePublishedAssets(registry.partials),
    runtimeAssets: summarizeRuntimeAssets(registry.runtimeAssets),
    themeBundles: summarizeThemeBundles(registry.themeBundles)
  };

  return {
    ok: true,
    scope: 'builtins',
    summary
  };
}
