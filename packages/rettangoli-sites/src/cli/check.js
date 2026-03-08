import { checkBuiltinAssets } from '../checkBuiltinAssets.js';
import { checkSiteUsage } from '../checkSiteUsage.js';

const ALLOWED_FORMATS = new Set(['text', 'json']);

function writeLine(stream, line = '') {
  stream.write(`${line}\n`);
}

function renderBuiltinSummary(result, stdout) {
  const { summary } = result;

  writeLine(stdout, 'Sites check: OK');
  writeLine(stdout, 'Scope: builtins');
  writeLine(stdout, `Schema version: ${summary.schemaVersion}`);
  writeLine(stdout, `Total published assets: ${summary.totalAssets}`);
  writeLine(stdout, `Templates: ${summary.templates.total} total, ${summary.templates.stable} stable, ${summary.templates.assetsWithExamples} with examples, ${summary.templates.assetsWithVtCoverage} with VT coverage (${summary.templates.vtSpecCount} specs)`);
  writeLine(stdout, `Partials: ${summary.partials.total} total, ${summary.partials.stable} stable, ${summary.partials.assetsWithExamples} with examples, ${summary.partials.assetsWithVtCoverage} with VT coverage (${summary.partials.vtSpecCount} specs)`);
  writeLine(stdout, `Runtime assets: ${summary.runtimeAssets.total} total, ${summary.runtimeAssets.stable} stable, ${summary.runtimeAssets.consumerReferenceCount} declared consumer references`);
  writeLine(stdout, `Theme bundles: ${summary.themeBundles.total} total, ${summary.themeBundles.stable} stable, ${summary.themeBundles.classCount} theme classes, ${summary.themeBundles.assetsWithVtCoverage} with VT coverage (${summary.themeBundles.vtSpecCount} specs)`);
}

function renderSiteUsageSummary(result, stdout) {
  const { summary, rootDir, pages } = result;

  writeLine(stdout, 'Sites check: OK');
  writeLine(stdout, 'Scope: site');
  writeLine(stdout, `Root dir: ${rootDir}`);
  writeLine(stdout, `Pages: ${summary.totalPages} total, ${summary.validatedPages} validated, ${summary.skippedPages} skipped`);

  const validatedTemplateCounts = pages.validated.reduce((counts, page) => {
    counts[page.builtinTemplateId] = (counts[page.builtinTemplateId] || 0) + 1;
    return counts;
  }, {});
  const validatedTemplateSummary = Object.entries(validatedTemplateCounts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([templateId, count]) => `${templateId}(${count})`)
    .join(', ');

  if (validatedTemplateSummary) {
    writeLine(stdout, `Validated templates: ${validatedTemplateSummary}`);
  }

  const skippedSummary = Object.entries(summary.skippedByReason)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([reason, count]) => `${reason}=${count}`)
    .join(', ');

  if (skippedSummary) {
    writeLine(stdout, `Skipped pages: ${skippedSummary}`);
  }
}

export async function checkSite(options = {}, deps = {}) {
  const {
    builtins,
    site = false,
    rootDir = process.cwd(),
    format = 'text',
    stdout = process.stdout
  } = options;
  const {
    checkBuiltinAssetsImpl = checkBuiltinAssets,
    checkSiteUsageImpl = checkSiteUsage
  } = deps;

  if (!ALLOWED_FORMATS.has(format)) {
    throw new Error(`Unsupported sites check format "${format}". Allowed formats: ${Array.from(ALLOWED_FORMATS).join(', ')}.`);
  }

  const shouldCheckBuiltins = builtins === true || (!site && builtins !== false);
  const shouldCheckSite = site === true;

  if (!shouldCheckBuiltins && !shouldCheckSite) {
    throw new Error('No site checks selected. Use --builtins and/or --site.');
  }

  const result = {
    ok: true,
    scopes: [],
    checks: {}
  };

  if (shouldCheckBuiltins) {
    result.scopes.push('builtins');
    result.checks.builtins = checkBuiltinAssetsImpl();
  }

  if (shouldCheckSite) {
    result.scopes.push('site');
    result.checks.site = await checkSiteUsageImpl({ rootDir });
  }

  if (format === 'json') {
    writeLine(stdout, JSON.stringify(result, null, 2));
    return result;
  }

  if (result.checks.builtins) {
    renderBuiltinSummary(result.checks.builtins, stdout);
  }

  if (result.checks.site) {
    if (result.checks.builtins) {
      writeLine(stdout);
    }
    renderSiteUsageSummary(result.checks.site, stdout);
  }

  return result;
}
