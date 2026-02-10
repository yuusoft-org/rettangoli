import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ALLOWED_TOP_LEVEL_KEYS = new Set(['markdown', 'markdownit', 'build']);
const MARKDOWN_BOOLEAN_KEYS = new Set(['html', 'linkify', 'typographer', 'breaks', 'xhtmlOut']);
const MARKDOWN_STRING_KEYS = new Set(['langPrefix', 'quotes', 'preset']);
const MARKDOWN_NUMBER_KEYS = new Set(['maxNesting']);
const ALLOWED_MARKDOWN_KEYS = new Set([
  ...MARKDOWN_BOOLEAN_KEYS,
  ...MARKDOWN_STRING_KEYS,
  ...MARKDOWN_NUMBER_KEYS,
  'shiki',
  'headingAnchors',
  'codePreview'
]);
const SHIKI_BOOLEAN_KEYS = new Set(['enabled']);
const SHIKI_STRING_KEYS = new Set(['theme']);
const ALLOWED_SHIKI_KEYS = new Set([...SHIKI_BOOLEAN_KEYS, ...SHIKI_STRING_KEYS]);
const CODE_PREVIEW_BOOLEAN_KEYS = new Set(['enabled', 'showSource']);
const CODE_PREVIEW_STRING_KEYS = new Set(['theme']);
const ALLOWED_CODE_PREVIEW_KEYS = new Set([...CODE_PREVIEW_BOOLEAN_KEYS, ...CODE_PREVIEW_STRING_KEYS]);
const ALLOWED_PRESETS = new Set(['default', 'commonmark', 'zero']);
const HEADING_ANCHORS_BOOLEAN_KEYS = new Set(['enabled', 'wrap']);
const HEADING_ANCHORS_STRING_KEYS = new Set(['slugMode', 'fallback']);
const ALLOWED_HEADING_ANCHORS_KEYS = new Set([...HEADING_ANCHORS_BOOLEAN_KEYS, ...HEADING_ANCHORS_STRING_KEYS]);
const ALLOWED_HEADING_ANCHOR_SLUG_MODES = new Set(['ascii', 'unicode']);
const BUILD_BOOLEAN_KEYS = new Set(['keepMarkdownFiles']);
const ALLOWED_BUILD_KEYS = new Set([...BUILD_BOOLEAN_KEYS]);
let didWarnLegacyMarkdownKey = false;

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function validateHeadingAnchors(value, configPath) {
  if (typeof value === 'boolean') {
    return;
  }

  if (!isPlainObject(value)) {
    throw new Error(`Invalid markdown option "headingAnchors" in "${configPath}": expected a boolean or object.`);
  }

  for (const key of Object.keys(value)) {
    if (!ALLOWED_HEADING_ANCHORS_KEYS.has(key)) {
      throw new Error(
        `Unsupported headingAnchors option "${key}" in "${configPath}". Supported options: ${Array.from(ALLOWED_HEADING_ANCHORS_KEYS).join(', ')}.`
      );
    }

    if (HEADING_ANCHORS_BOOLEAN_KEYS.has(key) && typeof value[key] !== 'boolean') {
      throw new Error(`Invalid headingAnchors option "${key}" in "${configPath}": expected a boolean.`);
    }

    if (HEADING_ANCHORS_STRING_KEYS.has(key) && typeof value[key] !== 'string') {
      throw new Error(`Invalid headingAnchors option "${key}" in "${configPath}": expected a string.`);
    }
  }

  if (value.slugMode !== undefined && !ALLOWED_HEADING_ANCHOR_SLUG_MODES.has(value.slugMode)) {
    throw new Error(
      `Invalid headingAnchors slugMode "${value.slugMode}" in "${configPath}". Allowed: ${Array.from(ALLOWED_HEADING_ANCHOR_SLUG_MODES).join(', ')}.`
    );
  }

  if (value.fallback !== undefined && value.fallback.trim() === '') {
    throw new Error(`Invalid headingAnchors option "fallback" in "${configPath}": expected a non-empty string.`);
  }
}

function validateCodePreview(value, configPath) {
  if (typeof value === 'boolean') {
    return;
  }

  if (!isPlainObject(value)) {
    throw new Error(`Invalid markdown option "codePreview" in "${configPath}": expected a boolean or object.`);
  }

  for (const key of Object.keys(value)) {
    if (!ALLOWED_CODE_PREVIEW_KEYS.has(key)) {
      throw new Error(
        `Unsupported codePreview option "${key}" in "${configPath}". Supported options: ${Array.from(ALLOWED_CODE_PREVIEW_KEYS).join(', ')}.`
      );
    }

    if (CODE_PREVIEW_BOOLEAN_KEYS.has(key) && typeof value[key] !== 'boolean') {
      throw new Error(`Invalid codePreview option "${key}" in "${configPath}": expected a boolean.`);
    }

    if (CODE_PREVIEW_STRING_KEYS.has(key) && typeof value[key] !== 'string') {
      throw new Error(`Invalid codePreview option "${key}" in "${configPath}": expected a string.`);
    }
  }

  if (typeof value.theme === 'string' && value.theme.trim() === '') {
    throw new Error(`Invalid codePreview option "theme" in "${configPath}": expected a non-empty string.`);
  }
}

function validateBuildConfig(value, configPath) {
  if (!isPlainObject(value)) {
    throw new Error(`Invalid build config in "${configPath}": expected an object.`);
  }

  for (const key of Object.keys(value)) {
    if (!ALLOWED_BUILD_KEYS.has(key)) {
      throw new Error(
        `Unsupported build option "${key}" in "${configPath}". Supported options: ${Array.from(ALLOWED_BUILD_KEYS).join(', ')}.`
      );
    }

    if (BUILD_BOOLEAN_KEYS.has(key) && typeof value[key] !== 'boolean') {
      throw new Error(`Invalid build option "${key}" in "${configPath}": expected a boolean.`);
    }
  }

  return { ...value };
}

function validateConfig(rawConfig, configPath) {
  if (rawConfig == null) {
    return {};
  }

  if (!isPlainObject(rawConfig)) {
    throw new Error(`Invalid site config in "${configPath}": expected a YAML object at the top level.`);
  }

  const config = { ...rawConfig };

  for (const key of Object.keys(config)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      throw new Error(
        `Unsupported key "${key}" in "${configPath}". Supported keys: markdownit (recommended), markdown (legacy alias), build.`
      );
    }
  }

  if (config.markdown !== undefined && config.markdownit !== undefined) {
    throw new Error(`Use only one of "markdownit" (recommended) or "markdown" (legacy alias) in "${configPath}".`);
  }

  if (config.markdown !== undefined && config.markdownit === undefined && !didWarnLegacyMarkdownKey) {
    console.warn(`"${configPath}" uses legacy key "markdown". Please rename it to "markdownit".`);
    didWarnLegacyMarkdownKey = true;
  }

  const normalizedConfig = {};
  const markdownConfig = config.markdownit ?? config.markdown;
  if (markdownConfig !== undefined) {
    if (!isPlainObject(markdownConfig)) {
      throw new Error(`Invalid markdown config in "${configPath}": expected an object.`);
    }

    for (const key of Object.keys(markdownConfig)) {
      if (!ALLOWED_MARKDOWN_KEYS.has(key)) {
        throw new Error(
          `Unsupported markdown option "${key}" in "${configPath}". Supported options: ${Array.from(ALLOWED_MARKDOWN_KEYS).join(', ')}.`
        );
      }

      if (key === 'headingAnchors') {
        validateHeadingAnchors(markdownConfig.headingAnchors, configPath);
        continue;
      }

      if (key === 'codePreview') {
        validateCodePreview(markdownConfig.codePreview, configPath);
        continue;
      }

      if (MARKDOWN_BOOLEAN_KEYS.has(key) && typeof markdownConfig[key] !== 'boolean') {
        throw new Error(`Invalid markdown option "${key}" in "${configPath}": expected a boolean.`);
      }

      if (MARKDOWN_STRING_KEYS.has(key) && typeof markdownConfig[key] !== 'string') {
        throw new Error(`Invalid markdown option "${key}" in "${configPath}": expected a string.`);
      }

      if (MARKDOWN_NUMBER_KEYS.has(key) && typeof markdownConfig[key] !== 'number') {
        throw new Error(`Invalid markdown option "${key}" in "${configPath}": expected a number.`);
      }

      if (key === 'maxNesting' && !Number.isInteger(markdownConfig[key])) {
        throw new Error(`Invalid markdown option "${key}" in "${configPath}": expected an integer.`);
      }

      if (key === 'preset' && !ALLOWED_PRESETS.has(markdownConfig[key])) {
        throw new Error(`Invalid markdown preset "${markdownConfig[key]}" in "${configPath}". Allowed: ${Array.from(ALLOWED_PRESETS).join(', ')}.`);
      }
    }

    if (markdownConfig.shiki !== undefined) {
      if (!isPlainObject(markdownConfig.shiki)) {
        throw new Error(`Invalid markdown option "shiki" in "${configPath}": expected an object.`);
      }

      for (const key of Object.keys(markdownConfig.shiki)) {
        if (!ALLOWED_SHIKI_KEYS.has(key)) {
          throw new Error(
            `Unsupported shiki option "${key}" in "${configPath}". Supported options: ${Array.from(ALLOWED_SHIKI_KEYS).join(', ')}.`
          );
        }

        if (SHIKI_BOOLEAN_KEYS.has(key) && typeof markdownConfig.shiki[key] !== 'boolean') {
          throw new Error(`Invalid shiki option "${key}" in "${configPath}": expected a boolean.`);
        }

        if (SHIKI_STRING_KEYS.has(key) && typeof markdownConfig.shiki[key] !== 'string') {
          throw new Error(`Invalid shiki option "${key}" in "${configPath}": expected a string.`);
        }
      }
    }

    normalizedConfig.markdown = { ...markdownConfig };
  }

  if (config.build !== undefined) {
    normalizedConfig.build = validateBuildConfig(config.build, configPath);
  }

  return normalizedConfig;
}

function readFirstExistingConfigPath(rootDir) {
  const yamlPath = path.join(rootDir, 'sites.config.yaml');
  const ymlPath = path.join(rootDir, 'sites.config.yml');
  const legacyJsPath = path.join(rootDir, 'sites.config.js');

  if (fs.existsSync(legacyJsPath)) {
    throw new Error(`"${legacyJsPath}" is no longer supported. Rename it to "sites.config.yaml".`);
  }

  if (fs.existsSync(yamlPath)) {
    return yamlPath;
  }

  if (fs.existsSync(ymlPath)) {
    return ymlPath;
  }

  return null;
}

/**
 * Load the sites.config.yaml/.yml file from a given directory
 * @param {string} rootDir - The root directory to look for sites.config.yaml/.yml
 * @param {boolean} throwOnError - Whether to throw on errors other than file not found
 * @param {boolean} _bustCache - Kept for callsite compatibility; not used for YAML
 * @returns {Promise<Object>} The loaded config object or empty object if not found
 */
export async function loadSiteConfig(rootDir, throwOnError = true, _bustCache = false) {
  try {
    const configPath = readFirstExistingConfigPath(rootDir);

    if (!configPath) {
      return {};
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    const parsed = yaml.load(configContent, { schema: yaml.JSON_SCHEMA });
    return validateConfig(parsed, configPath);
  } catch (e) {
    if (throwOnError) {
      throw e;
    }
    console.error('Error loading site YAML config:', e);
    return {};
  }
}
