import { parseAndRender } from 'jempl';
import path from 'path';
import yaml from 'js-yaml';
import matter from 'gray-matter';

import { createTemplateFunctions } from './render.js';
import { isPlainObject } from './utils/object.js';
import { resolveDirentKind } from './sources.js';
import {
  markdownOutputRelativePathForPage,
  normalizePageUrlOverride,
  normalizeRelativeUrlPath,
  resolvePageUrl
} from './routes.js';

const MATTER_OPTIONS = {
  engines: {
    yaml: (source) => yaml.load(source, { schema: yaml.JSON_SCHEMA })
  }
};

const EACH_CONFIG_KEYS = ['data', 'as', 'url'];
const EACH_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
// Page context keys set by the builder; an _each variable with one of these names would be overwritten.
const RESERVED_PAGE_CONTEXT_KEYS = new Set(['collections', 'page', 'build', 'content']);

// An exact top-level key wins (including keys that contain a dot); otherwise walk the dot path.
function resolveGlobalDataPath(globalData, dataPath) {
  if (Object.hasOwn(globalData, dataPath)) {
    return { found: true, value: globalData[dataPath] };
  }

  let current = globalData;
  for (const segment of dataPath.split('.')) {
    if (segment === '' || current === null || typeof current !== 'object' || !Object.hasOwn(current, segment)) {
      return { found: false };
    }
    current = current[segment];
  }

  return { found: true, value: current };
}

function resolveBindings(bindConfig, globalData, pagePath) {
  if (bindConfig === undefined) {
    return {};
  }

  if (!isPlainObject(bindConfig)) {
    throw new Error(`Invalid _bind in ${pagePath}: expected an object mapping local names to global data keys.`);
  }

  const bindings = {};
  for (const [rawLocalKey, rawSourceKey] of Object.entries(bindConfig)) {
    const localKey = String(rawLocalKey).trim();
    if (localKey === '') {
      throw new Error(`Invalid _bind in ${pagePath}: local key names must be non-empty.`);
    }

    if (typeof rawSourceKey !== 'string' || rawSourceKey.trim() === '') {
      throw new Error(`Invalid _bind in ${pagePath} for "${localKey}": expected a non-empty global data key string.`);
    }

    const sourceKey = rawSourceKey.trim();
    const resolved = resolveGlobalDataPath(globalData, sourceKey);
    if (!resolved.found) {
      throw new Error(`Invalid _bind in ${pagePath} for "${localKey}": global data key "${sourceKey}" not found.`);
    }

    bindings[localKey] = resolved.value;
  }

  return bindings;
}

function normalizeEachConfig(eachConfig, bindings, pagePath) {
  if (eachConfig === undefined) {
    return null;
  }

  if (!isPlainObject(eachConfig)) {
    throw new Error(`Invalid _each in ${pagePath}: expected an object with "data", "as", and "url".`);
  }

  for (const key of Object.keys(eachConfig)) {
    if (!EACH_CONFIG_KEYS.includes(key)) {
      throw new Error(`Invalid _each in ${pagePath}: unsupported key "${key}". Supported keys: ${EACH_CONFIG_KEYS.join(', ')}.`);
    }
  }

  for (const key of EACH_CONFIG_KEYS) {
    if (typeof eachConfig[key] !== 'string' || eachConfig[key].trim() === '') {
      throw new Error(`Invalid _each in ${pagePath}: "${key}" must be a non-empty string.`);
    }
  }

  const as = eachConfig.as.trim();
  if (!EACH_IDENTIFIER_PATTERN.test(as)) {
    throw new Error(`Invalid _each in ${pagePath}: "as" must be a variable name made of letters, digits, and underscores, not starting with a digit.`);
  }

  if (RESERVED_PAGE_CONTEXT_KEYS.has(as)) {
    throw new Error(`Invalid _each in ${pagePath}: "as" must not be a reserved name (${Array.from(RESERVED_PAGE_CONTEXT_KEYS).join(', ')}).`);
  }

  if (Object.hasOwn(bindings, as)) {
    throw new Error(`Invalid _each in ${pagePath}: "as" name "${as}" is already used by _bind.`);
  }

  return {
    data: eachConfig.data.trim(),
    as,
    url: eachConfig.url
  };
}

function splitSystemFrontmatter(frontmatter, globalData, pagePath) {
  const normalized = isPlainObject(frontmatter) ? { ...frontmatter } : {};
  const bindConfig = normalized._bind;
  const eachConfig = normalized._each;
  delete normalized._bind;
  delete normalized._each;

  const bindings = resolveBindings(bindConfig, globalData, pagePath);
  const each = normalizeEachConfig(eachConfig, bindings, pagePath);

  if (each && Object.hasOwn(normalized, 'url')) {
    throw new Error(`Invalid _each in ${pagePath}: remove the "url" frontmatter key; "_each.url" sets the URL of each generated page.`);
  }

  return { frontmatter: normalized, bindings, each };
}

// gray-matter reads the whole file as frontmatter when an opening "---" has no closing "---" line.
// This is the test gray-matter's parseMatter makes, on a source without a byte order mark.
function isUnclosedFrontmatter(raw) {
  return raw.startsWith('---') && raw.charAt(3) !== '-' && raw.slice(3).indexOf('\n---') === -1;
}

function hasPageExtension(fileName) {
  return fileName.endsWith('.yaml') || fileName.endsWith('.yml') || fileName.endsWith('.md');
}

// Parse frontmatter only when it is truly at the file start.
function readPageSource(fs, pagePath, isMarkdown) {
  const raw = fs.readFileSync(pagePath, 'utf8').replace(/^\uFEFF/, '');
  let parsed;
  try {
    parsed = matter(raw, MATTER_OPTIONS);
  } catch (error) {
    throw new Error(`Invalid frontmatter in ${pagePath}: ${error.message}`);
  }

  const unclosedFrontmatter = isUnclosedFrontmatter(raw);
  if (unclosedFrontmatter) {
    // A YAML page that starts with a "---" document marker followed by a list or scalar is all body.
    if (!isMarkdown && parsed.data !== null && !isPlainObject(parsed.data)) {
      return { frontmatter: {}, content: raw.trim(), unclosedFrontmatter: false };
    }
    console.warn(`Frontmatter in ${pagePath} starts with "---" but is never closed, so the whole file is read as frontmatter. Add a closing "---" line.`);
  }

  return {
    frontmatter: isPlainObject(parsed.data) ? parsed.data : {},
    content: (parsed.content || '').trim(),
    unclosedFrontmatter
  };
}

// Expand an _each page into one page entry per item of its data array.
// context: { globalData, componentRegistry, functions }
function expandEachPageEntries(context, baseEntry, publicFrontmatter, each) {
  const { globalData } = context;
  const { pagePath, bindings } = baseEntry;
  const resolved = resolveGlobalDataPath(globalData, each.data);
  if (!resolved.found) {
    throw new Error(`Invalid _each in ${pagePath}: global data path "${each.data}" not found.`);
  }

  if (!Array.isArray(resolved.value)) {
    const actualType = resolved.value === null ? 'null' : typeof resolved.value;
    throw new Error(`Invalid _each in ${pagePath}: global data path "${each.data}" must resolve to an array, got ${actualType}.`);
  }

  return resolved.value.map((item, index) => {
    const pageLabel = `${pagePath} (_each item ${index})`;
    const itemBindings = { ...bindings, [each.as]: item };
    const renderContext = { ...globalData, ...itemBindings };
    const renderOptions = { functions: createTemplateFunctions(context, pageLabel) };

    let renderedUrl;
    let renderedFrontmatter;
    try {
      renderedUrl = parseAndRender(each.url, renderContext, renderOptions);
      renderedFrontmatter = parseAndRender(publicFrontmatter, renderContext, renderOptions);
    } catch (error) {
      throw new Error(`Invalid _each in ${pagePath} for item ${index}: ${error.message}`);
    }

    const url = normalizePageUrlOverride(renderedUrl, pageLabel);

    return {
      ...baseEntry,
      pageLabel,
      frontmatter: { ...renderedFrontmatter, url },
      bindings: itemBindings,
      url,
      hasCustomUrl: true
    };
  });
}

// Read every page under pagesDir, in directory-listing order, into page entries.
// context: { fs, pagesDir, globalData, componentRegistry, functions }
export function collectPageEntries(context) {
  const { fs, pagesDir, globalData } = context;
  const pageEntries = [];

  function scanPages(basePath = '') {
    const fullDir = path.join(pagesDir, basePath);
    // Checked per folder: skip a folder that vanished or cannot be searched since its parent was listed.
    if (!fs.existsSync(fullDir)) return;

    const items = fs.readdirSync(fullDir, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(fullDir, item.name);
      const relativePath = basePath ? path.join(basePath, item.name) : item.name;
      const itemKind = resolveDirentKind(fs, itemPath, item);

      if (itemKind === 'directory') {
        scanPages(relativePath);
      } else if (itemKind === 'file' && hasPageExtension(item.name)) {
        const isMarkdown = item.name.endsWith('.md');
        const { frontmatter, content, unclosedFrontmatter } = readPageSource(fs, itemPath, isMarkdown);
        const { frontmatter: publicFrontmatter, bindings, each } = splitSystemFrontmatter(frontmatter, globalData, itemPath);
        const baseEntry = {
          pagePath: itemPath,
          pageLabel: itemPath,
          relativePath: normalizeRelativeUrlPath(relativePath),
          isMarkdown,
          content,
          unclosedFrontmatter,
          bindings
        };

        if (each) {
          for (const generatedEntry of expandEachPageEntries(context, baseEntry, publicFrontmatter, each)) {
            pageEntries.push(generatedEntry);
          }
          continue;
        }

        const hasCustomUrl = Object.hasOwn(publicFrontmatter, 'url');
        const url = resolvePageUrl(publicFrontmatter, relativePath, itemPath);
        const exposedFrontmatter = hasCustomUrl
          ? { ...publicFrontmatter, url }
          : publicFrontmatter;

        pageEntries.push({
          ...baseEntry,
          frontmatter: exposedFrontmatter,
          url,
          hasCustomUrl
        });
      }
    }
  }

  scanPages();
  return pageEntries;
}

export function assertUniquePageUrls(pageEntries) {
  const seen = new Map();

  for (const entry of pageEntries) {
    const existingEntry = seen.get(entry.url);
    if (existingEntry) {
      throw new Error(`Duplicate page URL "${entry.url}" in ${entry.pageLabel}; already used by ${existingEntry.pageLabel}.`);
    }
    seen.set(entry.url, entry);
  }
}

export function assertUniqueMarkdownOutputPaths(pageEntries) {
  const seen = new Map();
  for (const entry of pageEntries) {
    if (!entry.isMarkdown) {
      continue;
    }

    const outputRelativePath = markdownOutputRelativePathForPage(entry);
    const existingEntry = seen.get(outputRelativePath);
    if (existingEntry) {
      throw new Error(`Duplicate markdown output path "${outputRelativePath}" in ${entry.pageLabel}; already used by ${existingEntry.pageLabel}.`);
    }
    seen.set(outputRelativePath, entry);
  }
}

// Group pages by their "tags" frontmatter, in page order.
export function buildCollections(pageEntries) {
  const collections = {};

  for (const entry of pageEntries) {
    const publicFrontmatter = entry.frontmatter;

    // Process tags
    if (publicFrontmatter.tags) {
      // Normalize tags to array
      const tags = Array.isArray(publicFrontmatter.tags) ? publicFrontmatter.tags : [publicFrontmatter.tags];

      // Add to collections
      tags.forEach(tag => {
        if (typeof tag === 'string' && tag.trim()) {
          const trimmedTag = tag.trim();
          if (!collections[trimmedTag]) {
            collections[trimmedTag] = [];
          }
          collections[trimmedTag].push({
            data: publicFrontmatter,
            url: entry.url,
            content: entry.content
          });
        }
      });
    }
  }

  return collections;
}
