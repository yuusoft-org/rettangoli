const ALLOWED_CHANGEFREQS = new Set(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']);
const ALLOWED_TOP_LEVEL_KEYS = new Set(['enabled', 'siteUrl', 'outputPath', 'defaults', 'exclude', 'pages']);
const ALLOWED_DEFAULT_KEYS = new Set(['changefreq', 'priority', 'lastmod']);
const ALLOWED_ENTRY_KEYS = new Set(['changefreq', 'priority', 'lastmod', 'exclude']);
const SITEMAP_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/u;

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function rejectInvalidUrlString(rawUrl, contextLabel) {
  if (typeof rawUrl !== 'string') {
    throw new Error(`${contextLabel}: expected a string.`);
  }

  if (rawUrl === '') {
    throw new Error(`${contextLabel}: expected a non-empty string.`);
  }

  if (/[\u0000-\u001F\u007F]/u.test(rawUrl)) {
    throw new Error(`${contextLabel}: must not contain control characters.`);
  }

  if (/\s/u.test(rawUrl)) {
    throw new Error(`${contextLabel}: must not contain whitespace.`);
  }

  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(rawUrl) || rawUrl.startsWith('//')) {
    throw new Error(`${contextLabel}: expected a site-relative URL path.`);
  }

  if (rawUrl.includes('\\')) {
    throw new Error(`${contextLabel}: must use forward slashes.`);
  }

  if (rawUrl.includes('?') || rawUrl.includes('#')) {
    throw new Error(`${contextLabel}: must not include query strings or fragments.`);
  }
}

export function normalizeSitemapUrlPath(rawUrl, contextLabel) {
  rejectInvalidUrlString(rawUrl, contextLabel);

  const withLeadingSlash = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  const collapsedUrl = withLeadingSlash.replace(/\/+/g, '/');
  const pathWithoutSlashes = collapsedUrl.replace(/^\/+|\/+$/g, '');

  if (pathWithoutSlashes === '') {
    return '/';
  }

  const segments = pathWithoutSlashes.split('/');
  for (const segment of segments) {
    let decodedSegment;
    try {
      decodedSegment = decodeURIComponent(segment);
    } catch {
      throw new Error(`${contextLabel}: contains invalid URL encoding.`);
    }

    if (decodedSegment === '.' || decodedSegment === '..') {
      throw new Error(`${contextLabel}: must not contain "." or ".." segments.`);
    }

    if (decodedSegment.includes('/') || decodedSegment.includes('\\')) {
      throw new Error(`${contextLabel}: must not include encoded slashes or backslashes.`);
    }

    if (/[\u0000-\u001F\u007F]/u.test(decodedSegment)) {
      throw new Error(`${contextLabel}: must not contain control characters.`);
    }

    if (/\s/u.test(decodedSegment)) {
      throw new Error(`${contextLabel}: must not contain whitespace.`);
    }
  }

  return `/${segments.join('/')}/`;
}

function normalizeSitemapUrlPattern(rawPattern, contextLabel) {
  if (typeof rawPattern !== 'string') {
    throw new Error(`${contextLabel}: expected a string.`);
  }

  if (rawPattern.endsWith('*')) {
    const rawPrefix = rawPattern.slice(0, -1);
    return `${normalizeSitemapUrlPath(rawPrefix, contextLabel)}*`;
  }

  return normalizeSitemapUrlPath(rawPattern, contextLabel);
}

function validateSiteUrl(siteUrl, contextLabel) {
  if (typeof siteUrl !== 'string' || siteUrl.trim() === '') {
    throw new Error(`${contextLabel}: expected a non-empty URL string.`);
  }

  let parsed;
  try {
    parsed = new URL(siteUrl);
  } catch {
    throw new Error(`${contextLabel}: "${siteUrl}" is not a valid URL.`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${contextLabel}: protocol "${parsed.protocol}" is not supported. Allowed protocols: http:, https:.`);
  }

  if (parsed.search || parsed.hash) {
    throw new Error(`${contextLabel}: must not include query strings or fragments.`);
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/u, '');
  return parsed.toString().replace(/\/$/u, '');
}

function validateOutputPath(outputPath, contextLabel) {
  if (typeof outputPath !== 'string' || outputPath.trim() === '') {
    throw new Error(`${contextLabel}: expected a non-empty string.`);
  }

  if (/[\u0000-\u001F\u007F]/u.test(outputPath)) {
    throw new Error(`${contextLabel}: must not contain control characters.`);
  }

  if (/\s/u.test(outputPath)) {
    throw new Error(`${contextLabel}: must not contain whitespace.`);
  }

  if (outputPath.startsWith('/') || /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(outputPath)) {
    throw new Error(`${contextLabel}: expected a relative output path.`);
  }

  if (outputPath.includes('\\') || outputPath.includes('?') || outputPath.includes('#')) {
    throw new Error(`${contextLabel}: must be a clean relative file path.`);
  }

  const segments = outputPath.split('/').filter(Boolean);
  if (segments.length === 0) {
    throw new Error(`${contextLabel}: expected a relative file path.`);
  }

  for (const segment of segments) {
    if (segment === '.' || segment === '..') {
      throw new Error(`${contextLabel}: must not contain "." or ".." segments.`);
    }
  }

  return segments.join('/');
}

function normalizeLastmod(lastmod, contextLabel) {
  if (lastmod instanceof Date) {
    if (Number.isNaN(lastmod.getTime())) {
      throw new Error(`${contextLabel}: expected a valid date.`);
    }
    return lastmod.toISOString();
  }

  if (typeof lastmod !== 'string' || lastmod.trim() === '') {
    throw new Error(`${contextLabel}: expected an ISO date string.`);
  }

  const trimmed = lastmod.trim();
  if (!SITEMAP_DATE_RE.test(trimmed)) {
    throw new Error(`${contextLabel}: expected an ISO date string like "2026-05-25" or "2026-05-25T12:00:00Z".`);
  }

  return trimmed;
}

function normalizePriority(priority, contextLabel) {
  if (typeof priority !== 'number' || !Number.isFinite(priority)) {
    throw new Error(`${contextLabel}: expected a number from 0 to 1.`);
  }

  if (priority < 0 || priority > 1) {
    throw new Error(`${contextLabel}: expected a number from 0 to 1.`);
  }

  return priority;
}

function normalizeChangefreq(changefreq, contextLabel) {
  if (typeof changefreq !== 'string' || changefreq.trim() === '') {
    throw new Error(`${contextLabel}: expected a non-empty string.`);
  }

  const normalized = changefreq.trim();
  if (!ALLOWED_CHANGEFREQS.has(normalized)) {
    throw new Error(`${contextLabel}: expected one of ${Array.from(ALLOWED_CHANGEFREQS).join(', ')}.`);
  }

  return normalized;
}

function normalizeEntryOptions(value, contextLabel, { allowExclude }) {
  if (!isPlainObject(value)) {
    throw new Error(`${contextLabel}: expected an object.`);
  }

  const allowedKeys = allowExclude ? ALLOWED_ENTRY_KEYS : ALLOWED_DEFAULT_KEYS;
  const normalized = {};

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`${contextLabel}: unsupported option "${key}". Supported options: ${Array.from(allowedKeys).join(', ')}.`);
    }
  }

  if (value.changefreq !== undefined) {
    normalized.changefreq = normalizeChangefreq(value.changefreq, `${contextLabel}.changefreq`);
  }

  if (value.priority !== undefined) {
    normalized.priority = normalizePriority(value.priority, `${contextLabel}.priority`);
  }

  if (value.lastmod !== undefined) {
    normalized.lastmod = normalizeLastmod(value.lastmod, `${contextLabel}.lastmod`);
  }

  if (allowExclude && value.exclude !== undefined) {
    if (typeof value.exclude !== 'boolean') {
      throw new Error(`${contextLabel}.exclude: expected a boolean.`);
    }
    normalized.exclude = value.exclude;
  }

  return normalized;
}

function normalizePagesConfig(value, configPath) {
  if (!isPlainObject(value)) {
    throw new Error(`Invalid sitemap.pages in "${configPath}": expected an object.`);
  }

  const pages = {};
  for (const [rawUrl, rawOptions] of Object.entries(value)) {
    const url = normalizeSitemapUrlPath(rawUrl, `Invalid sitemap.pages URL "${rawUrl}" in "${configPath}"`);
    if (rawOptions === false) {
      pages[url] = { exclude: true };
      continue;
    }

    pages[url] = normalizeEntryOptions(rawOptions, `Invalid sitemap.pages.${rawUrl} in "${configPath}"`, { allowExclude: true });
  }

  return pages;
}

export function normalizeSitemapConfig(value, configPath = 'sitemap config') {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return { enabled: value };
  }

  if (!isPlainObject(value)) {
    throw new Error(`Invalid sitemap config in "${configPath}": expected a boolean or object.`);
  }

  const normalized = { enabled: true };

  for (const key of Object.keys(value)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      throw new Error(
        `Unsupported sitemap option "${key}" in "${configPath}". Supported options: ${Array.from(ALLOWED_TOP_LEVEL_KEYS).join(', ')}.`
      );
    }
  }

  if (value.enabled !== undefined) {
    if (typeof value.enabled !== 'boolean') {
      throw new Error(`Invalid sitemap.enabled in "${configPath}": expected a boolean.`);
    }
    normalized.enabled = value.enabled;
  }

  if (value.siteUrl !== undefined) {
    normalized.siteUrl = validateSiteUrl(value.siteUrl, `Invalid sitemap.siteUrl in "${configPath}"`);
  }

  if (value.outputPath !== undefined) {
    normalized.outputPath = validateOutputPath(value.outputPath, `Invalid sitemap.outputPath in "${configPath}"`);
  }

  if (value.defaults !== undefined) {
    normalized.defaults = normalizeEntryOptions(value.defaults, `Invalid sitemap.defaults in "${configPath}"`, { allowExclude: false });
  }

  if (value.exclude !== undefined) {
    if (!Array.isArray(value.exclude)) {
      throw new Error(`Invalid sitemap.exclude in "${configPath}": expected an array.`);
    }
    normalized.exclude = value.exclude.map((pattern, index) => (
      normalizeSitemapUrlPattern(pattern, `Invalid sitemap.exclude[${index}] in "${configPath}"`)
    ));
  }

  if (value.pages !== undefined) {
    normalized.pages = normalizePagesConfig(value.pages, configPath);
  }

  return normalized;
}

function resolveSitemapSiteUrl(sitemap, globalData) {
  if (sitemap.siteUrl) {
    return sitemap.siteUrl;
  }

  const baseUrl = globalData?.site?.baseUrl;
  if (baseUrl === undefined) {
    throw new Error('Sitemap generation requires sitemap.siteUrl or data.site.baseUrl.');
  }

  return validateSiteUrl(baseUrl, 'Invalid data.site.baseUrl');
}

function matchesExclude(url, pattern) {
  if (pattern.endsWith('*')) {
    return url.startsWith(pattern.slice(0, -1));
  }

  return url === pattern;
}

function normalizePageSitemapOptions(rawSitemap, pagePath) {
  if (rawSitemap === undefined || rawSitemap === null) {
    return {};
  }

  if (rawSitemap === false) {
    return { exclude: true };
  }

  if (rawSitemap === true) {
    return {};
  }

  return normalizeEntryOptions(rawSitemap, `Invalid sitemap frontmatter in ${pagePath}`, { allowExclude: true });
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatPriority(priority) {
  return String(Number(priority.toFixed(3))).replace(/\.0+$/u, '');
}

function joinSiteUrl(siteUrl, pageUrl) {
  const parsed = new URL(siteUrl);
  const basePath = parsed.pathname.replace(/\/+$/u, '');
  parsed.pathname = `${basePath}${pageUrl}`.replace(/\/+/g, '/');
  return parsed.toString();
}

function buildUrlEntryXml(entry) {
  const lines = [
    '  <url>',
    `    <loc>${escapeXml(entry.loc)}</loc>`
  ];

  if (entry.lastmod !== undefined) {
    lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
  }

  if (entry.changefreq !== undefined) {
    lines.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
  }

  if (entry.priority !== undefined) {
    lines.push(`    <priority>${formatPriority(entry.priority)}</priority>`);
  }

  lines.push('  </url>');
  return lines.join('\n');
}

export function buildSitemapXml({ pageEntries, sitemap, globalData }) {
  if (!sitemap || sitemap.enabled === false) {
    return null;
  }

  const normalizedSitemap = normalizeSitemapConfig(sitemap);
  if (normalizedSitemap.enabled === false) {
    return null;
  }

  const siteUrl = resolveSitemapSiteUrl(normalizedSitemap, globalData);
  const excludePatterns = normalizedSitemap.exclude || [];
  const defaultOptions = normalizedSitemap.defaults || {};
  const pageOptions = normalizedSitemap.pages || {};

  const entries = [];
  for (const pageEntry of pageEntries) {
    const url = pageEntry.url;
    const configuredOptions = pageOptions[url] || {};
    const frontmatterOptions = normalizePageSitemapOptions(pageEntry.frontmatter?.sitemap, pageEntry.pagePath);
    const options = {
      ...defaultOptions,
      ...configuredOptions,
      ...frontmatterOptions
    };

    if (excludePatterns.some((pattern) => matchesExclude(url, pattern)) || options.exclude === true) {
      continue;
    }

    const entry = {
      loc: joinSiteUrl(siteUrl, url)
    };

    if (hasOwn(options, 'lastmod')) {
      entry.lastmod = options.lastmod;
    }

    if (hasOwn(options, 'changefreq')) {
      entry.changefreq = options.changefreq;
    }

    if (hasOwn(options, 'priority')) {
      entry.priority = options.priority;
    }

    entries.push(entry);
  }

  entries.sort((left, right) => left.loc.localeCompare(right.loc));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(buildUrlEntryXml),
    '</urlset>',
    ''
  ].join('\n');
}

export function resolveSitemapOutputPath(sitemap) {
  const normalizedSitemap = normalizeSitemapConfig(sitemap);
  return normalizedSitemap?.outputPath || 'sitemap.xml';
}
