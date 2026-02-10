import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ALLOWED_TOP_LEVEL_KEYS = new Set(['markdown', 'markdownit']);
const MARKDOWN_BOOLEAN_KEYS = new Set(['html', 'linkify', 'typographer', 'breaks', 'headingAnchors', 'xhtmlOut']);
const MARKDOWN_STRING_KEYS = new Set(['langPrefix', 'quotes', 'preset']);
const MARKDOWN_NUMBER_KEYS = new Set(['maxNesting']);
const ALLOWED_MARKDOWN_KEYS = new Set([
  ...MARKDOWN_BOOLEAN_KEYS,
  ...MARKDOWN_STRING_KEYS,
  ...MARKDOWN_NUMBER_KEYS,
  'shiki'
]);
const SHIKI_BOOLEAN_KEYS = new Set(['enabled']);
const SHIKI_STRING_KEYS = new Set(['theme']);
const ALLOWED_SHIKI_KEYS = new Set([...SHIKI_BOOLEAN_KEYS, ...SHIKI_STRING_KEYS]);
const ALLOWED_PRESETS = new Set(['default', 'commonmark', 'zero']);

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
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
      throw new Error(`Unsupported key "${key}" in "${configPath}". Supported keys: markdown, markdownit.`);
    }
  }

  if (config.markdown !== undefined && config.markdownit !== undefined) {
    throw new Error(`Use only one of "markdown" or "markdownit" in "${configPath}".`);
  }

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

    return {
      markdown: { ...markdownConfig }
    };
  }

  return {};
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
