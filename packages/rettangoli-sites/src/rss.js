import { escapeXml, hasOwn, isPlainObject, joinSiteUrl, validateRelativeOutputPath, validateSiteUrl } from './utils/xml.js';
import { normalizeSitemapUrlPath } from './sitemap.js';

const ALLOWED_FEED_KEYS = new Set([
  'collection',
  'include',
  'exclude',
  'filter',
  'language',
  'outputPath',
  'limit',
  'title',
  'description',
  'dateField'
]);
// Top-level keys: feed keys double as single-feed shorthand, plus the shared keys.
const ALLOWED_TOP_LEVEL_KEYS = new Set(['enabled', 'siteUrl', 'feeds', ...ALLOWED_FEED_KEYS]);
const SINGLE_FEED_KEYS = ['collection', 'include', 'exclude', 'filter', 'outputPath'];
const RSS_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/u;
const FEED_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/u;
const DEFAULT_LIMIT = 20;
const DEFAULT_OUTPUT_PATH = 'rss.xml';

function normalizeLimit(limit, contextLabel) {
  if (typeof limit !== 'number' || !Number.isInteger(limit)) {
    throw new Error(`${contextLabel}: expected an integer.`);
  }

  if (limit < 1) {
    throw new Error(`${contextLabel}: expected an integer greater than zero.`);
  }

  return limit;
}

function normalizeStringField(value, contextLabel) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${contextLabel}: expected a non-empty string.`);
  }

  return value.trim();
}

function normalizeUrlPattern(rawPattern, contextLabel) {
  if (typeof rawPattern !== 'string' || rawPattern.trim() === '') {
    throw new Error(`${contextLabel}: expected a non-empty string.`);
  }

  if (rawPattern.endsWith('*')) {
    return `${normalizeSitemapUrlPath(rawPattern.slice(0, -1), contextLabel)}*`;
  }

  return normalizeSitemapUrlPath(rawPattern, contextLabel);
}

function normalizeUrlPatterns(value, contextLabel) {
  if (!Array.isArray(value)) {
    throw new Error(`${contextLabel}: expected an array of URL path patterns.`);
  }

  return value.map((pattern, index) => normalizeUrlPattern(pattern, `${contextLabel}[${index}]`));
}

function normalizeFilter(value, contextLabel) {
  if (!isPlainObject(value)) {
    throw new Error(`${contextLabel}: expected an object of frontmatter key/value matches.`);
  }

  const normalized = Object.create(null);
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = String(rawKey).trim();
    if (key === '') {
      throw new Error(`${contextLabel}: keys must be non-empty.`);
    }

    const type = typeof rawValue;
    if (type !== 'string' && type !== 'number' && type !== 'boolean') {
      throw new Error(`${contextLabel}.${key}: expected a string, number, or boolean.`);
    }

    normalized[key] = rawValue;
  }

  return normalized;
}

function normalizeFeedConfig(value, configPath, label, defaults, name) {
  if (!isPlainObject(value)) {
    throw new Error(`Invalid ${label} in "${configPath}": expected an object.`);
  }

  for (const key of Object.keys(value)) {
    if (!ALLOWED_FEED_KEYS.has(key)) {
      throw new Error(
        `Unsupported ${label} option "${key}" in "${configPath}". Supported options: ${Array.from(ALLOWED_FEED_KEYS).join(', ')}.`
      );
    }
  }

  const normalized = { ...defaults };
  if (name !== undefined) {
    normalized.name = name;
  }

  if (value.collection !== undefined) {
    normalized.collection = normalizeStringField(value.collection, `Invalid ${label}.collection in "${configPath}"`);
  }

  if (value.include !== undefined) {
    normalized.include = normalizeUrlPatterns(value.include, `Invalid ${label}.include in "${configPath}"`);
  }

  if (value.exclude !== undefined) {
    normalized.exclude = normalizeUrlPatterns(value.exclude, `Invalid ${label}.exclude in "${configPath}"`);
  }

  if (value.filter !== undefined) {
    normalized.filter = normalizeFilter(value.filter, `Invalid ${label}.filter in "${configPath}"`);
  }

  if (value.language !== undefined) {
    normalized.language = normalizeStringField(value.language, `Invalid ${label}.language in "${configPath}"`);
  }

  if (value.outputPath !== undefined) {
    normalized.outputPath = validateRelativeOutputPath(value.outputPath, `Invalid ${label}.outputPath in "${configPath}"`);
  }

  if (value.limit !== undefined) {
    normalized.limit = normalizeLimit(value.limit, `Invalid ${label}.limit in "${configPath}"`);
  }

  if (value.title !== undefined) {
    normalized.title = normalizeStringField(value.title, `Invalid ${label}.title in "${configPath}"`);
  }

  if (value.description !== undefined) {
    normalized.description = normalizeStringField(value.description, `Invalid ${label}.description in "${configPath}"`);
  }

  if (value.dateField !== undefined) {
    normalized.dateField = normalizeStringField(value.dateField, `Invalid ${label}.dateField in "${configPath}"`);
  }

  return normalized;
}

function buildSingleFeed(value, configPath, defaults) {
  const feedValue = {};
  for (const key of SINGLE_FEED_KEYS) {
    if (hasOwn(value, key)) {
      feedValue[key] = value[key];
    }
  }

  const feed = normalizeFeedConfig(feedValue, configPath, 'rss', defaults, undefined);
  if (feed.outputPath === undefined) {
    feed.outputPath = DEFAULT_OUTPUT_PATH;
  }
  return feed;
}

function normalizeFeedsConfig(feeds, configPath, defaults) {
  if (!isPlainObject(feeds)) {
    throw new Error(`Invalid rss.feeds in "${configPath}": expected an object of named feeds.`);
  }

  if (Object.keys(feeds).length === 0) {
    throw new Error(`Invalid rss.feeds in "${configPath}": expected at least one named feed.`);
  }

  const normalized = [];
  for (const [rawName, rawFeed] of Object.entries(feeds)) {
    const name = String(rawName).trim();
    if (name === '') {
      throw new Error(`Invalid rss.feeds in "${configPath}": feed names must be non-empty.`);
    }

    if (!FEED_NAME_RE.test(name)) {
      throw new Error(
        `Invalid rss.feeds name "${name}" in "${configPath}": feed names may only contain letters, numbers, "_", and "-".`
      );
    }

    const feed = normalizeFeedConfig(rawFeed, configPath, `rss.feeds.${name}`, defaults, name);
    if (feed.outputPath === undefined) {
      feed.outputPath = `rss-${name}.xml`;
    }
    normalized.push(feed);
  }

  return normalized;
}

function assertUniqueOutputPaths(feeds, configPath) {
  const seen = new Map();
  for (const feed of feeds) {
    if (seen.has(feed.outputPath)) {
      throw new Error(`Duplicate rss outputPath "${feed.outputPath}" in "${configPath}": every feed must write to a distinct file.`);
    }
    seen.set(feed.outputPath, feed);
  }
}

export function normalizeRssConfig(value, configPath = 'rss config') {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value
      ? { enabled: true, feeds: [{ outputPath: DEFAULT_OUTPUT_PATH, limit: DEFAULT_LIMIT }] }
      : { enabled: false };
  }

  if (!isPlainObject(value)) {
    throw new Error(`Invalid rss config in "${configPath}": expected a boolean or object.`);
  }

  for (const key of Object.keys(value)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      throw new Error(
        `Unsupported rss option "${key}" in "${configPath}". Supported options: ${Array.from(ALLOWED_TOP_LEVEL_KEYS).join(', ')}.`
      );
    }
  }

  const normalized = { enabled: true };

  if (value.enabled !== undefined) {
    if (typeof value.enabled !== 'boolean') {
      throw new Error(`Invalid rss.enabled in "${configPath}": expected a boolean.`);
    }
    normalized.enabled = value.enabled;
  }

  if (value.siteUrl !== undefined) {
    normalized.siteUrl = validateSiteUrl(value.siteUrl, `Invalid rss.siteUrl in "${configPath}"`);
  }

  const defaults = {
    limit: DEFAULT_LIMIT
  };

  if (value.limit !== undefined) {
    defaults.limit = normalizeLimit(value.limit, `Invalid rss.limit in "${configPath}"`);
  }

  if (value.dateField !== undefined) {
    defaults.dateField = normalizeStringField(value.dateField, `Invalid rss.dateField in "${configPath}"`);
  }

  if (value.language !== undefined) {
    defaults.language = normalizeStringField(value.language, `Invalid rss.language in "${configPath}"`);
  }

  if (value.title !== undefined) {
    defaults.title = normalizeStringField(value.title, `Invalid rss.title in "${configPath}"`);
  }

  if (value.description !== undefined) {
    defaults.description = normalizeStringField(value.description, `Invalid rss.description in "${configPath}"`);
  }

  const hasSingleFeedKeys = SINGLE_FEED_KEYS.some((key) => hasOwn(value, key));

  if (value.feeds !== undefined) {
    if (hasSingleFeedKeys) {
      throw new Error(`Invalid rss config in "${configPath}": use either "feeds" or single-feed keys, not both.`);
    }
    normalized.feeds = normalizeFeedsConfig(value.feeds, configPath, defaults);
  } else {
    normalized.feeds = [buildSingleFeed(value, configPath, defaults)];
  }

  assertUniqueOutputPaths(normalized.feeds, configPath);
  return normalized;
}

function resolveRssSiteUrl(rss, globalData) {
  if (rss.siteUrl) {
    return rss.siteUrl;
  }

  const baseUrl = globalData?.site?.baseUrl;
  if (baseUrl === undefined) {
    throw new Error('RSS generation requires rss.siteUrl or data.site.baseUrl.');
  }

  return validateSiteUrl(baseUrl, 'Invalid data.site.baseUrl');
}

function resolveChannelTitle(feed, globalData, siteUrl) {
  if (feed.title) {
    return feed.title;
  }

  const site = globalData?.site;
  return site?.title || site?.name || new URL(siteUrl).hostname;
}

function resolveChannelDescription(feed, globalData) {
  return feed.description ?? globalData?.site?.description ?? '';
}

function matchesPattern(url, pattern) {
  if (pattern.endsWith('*')) {
    return url.startsWith(pattern.slice(0, -1));
  }

  return url === pattern;
}

function entryData(entry) {
  return entry.data ?? entry.frontmatter;
}

function matchesFilter(entry, filter) {
  if (!filter) {
    return true;
  }

  const data = entryData(entry) || {};
  return Object.entries(filter).every(([key, value]) => {
    const entryValue = data[key];
    if (Array.isArray(entryValue)) {
      return entryValue.includes(value);
    }
    return entryValue === value;
  });
}

const RSS_DATE_PARTS_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2}))?$/u;

function normalizeFeedDate(rawDate) {
  if (rawDate === undefined || rawDate === null || rawDate === '') {
    return null;
  }

  if (rawDate instanceof Date) {
    const time = rawDate.getTime();
    return Number.isNaN(time) ? null : rawDate;
  }

  if (typeof rawDate !== 'string') {
    return null;
  }

  const trimmed = rawDate.trim();
  if (!RSS_DATE_RE.test(trimmed)) {
    return null;
  }

  // Reject calendar-invalid dates (e.g. 2026-02-30) that `new Date()` would
  // silently roll over, and reject out-of-range time components.
  const parts = trimmed.match(RSS_DATE_PARTS_RE);
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);

  // setUTCFullYear (unlike Date.UTC) interprets years 0-99 literally, so
  // round-tripping validates the calendar date without remapping early years.
  const dateUtc = new Date(0);
  dateUtc.setUTCFullYear(year, month - 1, day);
  if (dateUtc.getUTCFullYear() !== year || dateUtc.getUTCMonth() !== month - 1 || dateUtc.getUTCDate() !== day) {
    return null;
  }

  if (parts[4] !== undefined) {
    const hour = Number(parts[4]);
    const minute = Number(parts[5]);
    const second = Number(parts[6]);
    if (hour > 23 || minute > 59 || second > 59) {
      return null;
    }
  }

  const parsed = new Date(trimmed);
  const time = parsed.getTime();
  return Number.isNaN(time) ? null : parsed;
}

function toRfc822(date) {
  return date.toUTCString();
}

function humanizeUrlBasename(url) {
  const segments = url.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) {
    return 'Untitled';
  }
  return last.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildItemXml(entry, siteUrl, dateField) {
  const data = entryData(entry) || {};
  const link = joinSiteUrl(siteUrl, entry.url);
  const lines = [
    '    <item>',
    `      <title>${escapeXml(data.title || humanizeUrlBasename(entry.url))}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(link)}</guid>`
  ];

  const description = data.description || data.summary;
  if (description !== undefined) {
    lines.push(`      <description>${escapeXml(description)}</description>`);
  }

  const pubDate = normalizeFeedDate(data[dateField]);
  if (pubDate !== null) {
    lines.push(`      <pubDate>${escapeXml(toRfc822(pubDate))}</pubDate>`);
  }

  lines.push('    </item>');
  return lines.join('\n');
}

function selectFeedEntries(feed, pageEntries, collections) {
  const collectionEntries = feed.collection && hasOwn(collections, feed.collection) ? collections[feed.collection] : null;
  const source = feed.collection ? (Array.isArray(collectionEntries) ? collectionEntries : []) : pageEntries;

  const filtered = source.filter((entry) => {
    if (feed.include && !feed.include.some((pattern) => matchesPattern(entry.url, pattern))) {
      return false;
    }

    if (feed.exclude && feed.exclude.some((pattern) => matchesPattern(entry.url, pattern))) {
      return false;
    }

    if (feed.filter && !matchesFilter(entry, feed.filter)) {
      return false;
    }

    return true;
  });

  const dateField = feed.dateField || 'date';
  const sorted = [...filtered].sort((left, right) => {
    const leftDate = normalizeFeedDate(entryData(left)?.[dateField]);
    const rightDate = normalizeFeedDate(entryData(right)?.[dateField]);

    if (leftDate === null && rightDate === null) {
      return 0;
    }
    if (leftDate === null) {
      return 1;
    }
    if (rightDate === null) {
      return -1;
    }

    return rightDate.getTime() - leftDate.getTime();
  });

  return sorted.slice(0, feed.limit);
}

function buildFeedXml(feed, siteUrl, globalData, pageEntries, collections, buildTime, title) {
  const channelTitle = title || resolveChannelTitle(feed, globalData, siteUrl);
  const selfUrl = joinSiteUrl(siteUrl, `/${feed.outputPath}`);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(channelTitle)}</title>`,
    `    <link>${escapeXml(siteUrl)}</link>`,
    `    <description>${escapeXml(resolveChannelDescription(feed, globalData))}</description>`,
    `    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />`
  ];

  if (feed.language) {
    lines.push(`    <language>${escapeXml(feed.language)}</language>`);
  }

  lines.push(`    <lastBuildDate>${escapeXml(toRfc822(buildTime))}</lastBuildDate>`);

  const entries = selectFeedEntries(feed, pageEntries, collections);
  for (const entry of entries) {
    lines.push(buildItemXml(entry, siteUrl, feed.dateField || 'date'));
  }

  lines.push('  </channel>', '</rss>', '');
  return lines.join('\n');
}

export function buildRssFeeds({ pageEntries, collections, rss, globalData, buildTime = new Date() }) {
  if (rss === undefined || rss === null || rss === false) {
    return [];
  }

  const normalizedRss = normalizeRssConfig(rss);
  if (normalizedRss.enabled === false) {
    return [];
  }

  const siteUrl = resolveRssSiteUrl(normalizedRss, globalData);
  return (normalizedRss.feeds || []).map((feed) => {
    const title = resolveChannelTitle(feed, globalData, siteUrl);
    return {
      outputPath: feed.outputPath,
      title,
      href: joinSiteUrl(siteUrl, `/${feed.outputPath}`),
      xml: buildFeedXml(feed, siteUrl, globalData, pageEntries, collections, buildTime, title)
    };
  });
}
