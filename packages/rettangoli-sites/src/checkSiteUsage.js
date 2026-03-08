import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import yaml from 'js-yaml';
import { loadSiteConfig } from './utils/loadSiteConfig.js';
import {
  deepMerge,
  extractFrontmatterAndContent,
  relativePagePathToUrl,
  splitSystemFrontmatter
} from './utils/siteRuntime.js';
import { readBuiltinAssetRegistry } from './contracts/index.js';

function normalizePathForDisplay(value) {
  return value.replace(/\\/g, '/');
}

function readYamlFile(filePath, label) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = yaml.load(raw, { schema: yaml.JSON_SCHEMA });
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must contain a YAML object.`);
  }
  return parsed;
}

function readGlobalData(fsImpl, rootDir) {
  const dataDir = path.join(rootDir, 'data');
  const globalData = {};

  if (!fsImpl.existsSync(dataDir)) {
    return globalData;
  }

  const files = fsImpl.readdirSync(dataDir, { withFileTypes: true });
  files.forEach((entry) => {
    if (!entry.isFile() || (!entry.name.endsWith('.yaml') && !entry.name.endsWith('.yml'))) {
      return;
    }

    const filePath = path.join(dataDir, entry.name);
    const content = fsImpl.readFileSync(filePath, 'utf8');
    const key = path.basename(entry.name, path.extname(entry.name));
    try {
      globalData[key] = yaml.load(content, { schema: yaml.JSON_SCHEMA });
    } catch (error) {
      throw new Error(`Invalid YAML in "${filePath}": ${error.message}`);
    }
  });

  return globalData;
}

function readLocalTemplateKeys(fsImpl, rootDir) {
  const templatesDir = path.join(rootDir, 'templates');
  const keys = new Set();

  function walk(dir, basePath = '') {
    if (!fsImpl.existsSync(dir)) {
      return;
    }

    const entries = fsImpl.readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const nextBasePath = basePath ? `${basePath}/${entry.name}` : entry.name;
        walk(entryPath, nextBasePath);
        return;
      }

      if (!entry.isFile() || (!entry.name.endsWith('.yaml') && !entry.name.endsWith('.yml'))) {
        return;
      }

      const nameWithoutExt = path.basename(entry.name, path.extname(entry.name));
      const key = basePath ? `${basePath}/${nameWithoutExt}` : nameWithoutExt;
      keys.add(key);
    });
  }

  walk(templatesDir);
  return keys;
}

function readPageFiles(fsImpl, rootDir) {
  const pagesDir = path.join(rootDir, 'pages');
  const files = [];

  function walk(dir, basePath = '') {
    if (!fsImpl.existsSync(dir)) {
      return;
    }

    const entries = fsImpl.readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      const entryPath = path.join(dir, entry.name);
      const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

      if (entry.isDirectory()) {
        walk(entryPath, relativePath);
        return;
      }

      if (!entry.isFile() || (!entry.name.endsWith('.yaml') && !entry.name.endsWith('.yml') && !entry.name.endsWith('.md'))) {
        return;
      }

      files.push(relativePath);
    });
  }

  walk(pagesDir);
  return files.sort();
}

function buildCollections(pageRecords) {
  const collections = {};

  pageRecords.forEach((record) => {
    const tags = record.publicFrontmatter.tags;
    if (!tags) {
      return;
    }

    const normalizedTags = Array.isArray(tags) ? tags : [tags];
    normalizedTags.forEach((tag) => {
      if (typeof tag !== 'string' || tag.trim() === '') {
        return;
      }

      const trimmedTag = tag.trim();
      if (!collections[trimmedTag]) {
        collections[trimmedTag] = [];
      }

      collections[trimmedTag].push({
        data: record.publicFrontmatter,
        url: record.url,
        content: record.content
      });
    });
  });

  return collections;
}

function createBuiltinTemplateImportIndex(templateEntries) {
  const byPublishedPath = new Map();
  templateEntries.forEach((entry) => {
    byPublishedPath.set(entry.publishedPath, entry);
  });

  return {
    resolveImportUrl(importUrl) {
      if (typeof importUrl !== 'string' || importUrl.trim() === '') {
        return null;
      }

      let parsed;
      try {
        parsed = new URL(importUrl);
      } catch {
        return null;
      }

      for (const [publishedPath, entry] of byPublishedPath.entries()) {
        if (parsed.pathname.endsWith(`/${publishedPath}`) || parsed.pathname === `/${publishedPath}`) {
          return entry;
        }
      }

      return null;
    }
  };
}

function createSchemaValidatorFactory(dataContractSchema) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    allowUnionTypes: true
  });
  const cache = new Map();

  return function getValidator(schemaRef) {
    if (cache.has(schemaRef)) {
      return cache.get(schemaRef);
    }

    const validator = ajv.compile({
      $schema: dataContractSchema.$schema,
      $defs: dataContractSchema.$defs,
      $ref: schemaRef
    });
    cache.set(schemaRef, validator);
    return validator;
  };
}

function formatValidationErrors(errors = []) {
  return errors.map((error) => {
    const location = error.instancePath || '/';
    return `${location} ${error.message}`.trim();
  });
}

function summarizeSkippedPages(skippedPages) {
  return skippedPages.reduce((summary, page) => {
    summary[page.reason] = (summary[page.reason] || 0) + 1;
    return summary;
  }, {});
}

function formatSiteFailures(failures) {
  const lines = ['Sites check failed:'];

  failures.forEach((failure) => {
    lines.push(`- ${failure.pagePath} (${failure.template} -> ${failure.builtinTemplateId})`);
    failure.errors.forEach((error) => {
      lines.push(`  - ${error}`);
    });
  });

  return lines.join('\n');
}

function tryValidateYamlPageBody(relativePagePath, content) {
  const extension = path.extname(relativePagePath).toLowerCase();
  if (extension !== '.yaml' && extension !== '.yml') {
    return;
  }

  try {
    yaml.load(content, { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    throw new Error(`Invalid YAML page content in /pages/${normalizePathForDisplay(relativePagePath)}: ${error.message}`);
  }
}

export async function checkSiteUsage(options = {}) {
  const {
    rootDir = process.cwd(),
    fsImpl = fs,
    loadSiteConfigImpl = loadSiteConfig,
    readBuiltinAssetRegistryImpl = readBuiltinAssetRegistry
  } = options;

  const normalizedRootDir = path.resolve(rootDir);
  const siteConfig = await loadSiteConfigImpl(normalizedRootDir);
  const imports = siteConfig.imports || {};

  const { registry, paths } = readBuiltinAssetRegistryImpl();
  const dataContractSchema = readYamlFile(paths.dataContractSchema, 'data contract schema');
  const builtinTemplateImports = createBuiltinTemplateImportIndex(registry.templates);
  const getValidator = createSchemaValidatorFactory(dataContractSchema);

  const globalData = readGlobalData(fsImpl, normalizedRootDir);
  const localTemplateKeys = readLocalTemplateKeys(fsImpl, normalizedRootDir);
  const pageFiles = readPageFiles(fsImpl, normalizedRootDir);

  const pageRecords = [];
  const earlyFailures = [];

  pageFiles.forEach((relativePath) => {
    const absolutePath = path.join(normalizedRootDir, 'pages', relativePath);
    const pagePathLabel = `/pages/${normalizePathForDisplay(relativePath)}`;

    try {
      const { frontmatter, content } = extractFrontmatterAndContent(fsImpl, absolutePath);
      tryValidateYamlPageBody(relativePath, content);

      const { frontmatter: publicFrontmatter, bindings } = splitSystemFrontmatter(frontmatter, globalData, pagePathLabel);

      pageRecords.push({
        absolutePath,
        pagePathLabel,
        relativePath: normalizePathForDisplay(relativePath),
        publicFrontmatter,
        bindings,
        content,
        url: relativePagePathToUrl(relativePath)
      });
    } catch (error) {
      earlyFailures.push({
        pagePath: pagePathLabel,
        template: '(unresolved)',
        builtinTemplateId: '(unresolved)',
        errors: [error.message]
      });
    }
  });

  const collections = buildCollections(pageRecords);
  const skippedPages = [];
  const validatedPages = [];
  const validationFailures = [];

  pageRecords.forEach((record) => {
    const templateId = record.publicFrontmatter.template;
    if (!templateId) {
      skippedPages.push({
        pagePath: record.pagePathLabel,
        reason: 'no-template'
      });
      return;
    }

    if (localTemplateKeys.has(templateId)) {
      skippedPages.push({
        pagePath: record.pagePathLabel,
        template: templateId,
        reason: 'local-template'
      });
      return;
    }

    const importUrl = imports.templates?.[templateId];
    const builtinTemplateEntry = builtinTemplateImports.resolveImportUrl(importUrl);

    if (!builtinTemplateEntry) {
      skippedPages.push({
        pagePath: record.pagePathLabel,
        template: templateId,
        reason: importUrl ? 'external-template-import' : 'unmanaged-template'
      });
      return;
    }

    const pageData = deepMerge(globalData, record.publicFrontmatter);
    Object.assign(pageData, record.bindings);
    pageData.collections = collections;
    pageData.page = { url: record.url };
    pageData.build = { isScreenshotMode: false };

    const validator = getValidator(builtinTemplateEntry.schemaRef);
    const isValid = validator(pageData);

    if (!isValid) {
      validationFailures.push({
        pagePath: record.pagePathLabel,
        template: templateId,
        builtinTemplateId: builtinTemplateEntry.id,
        errors: formatValidationErrors(validator.errors)
      });
      return;
    }

    validatedPages.push({
      pagePath: record.pagePathLabel,
      template: templateId,
      builtinTemplateId: builtinTemplateEntry.id
    });
  });

  const failures = [...earlyFailures, ...validationFailures];
  if (failures.length > 0) {
    throw new Error(formatSiteFailures(failures));
  }

  return {
    ok: true,
    scope: 'site',
    rootDir: normalizedRootDir,
    summary: {
      totalPages: pageFiles.length,
      validatedPages: validatedPages.length,
      skippedPages: skippedPages.length,
      skippedByReason: summarizeSkippedPages(skippedPages)
    },
    pages: {
      validated: validatedPages,
      skipped: skippedPages
    }
  };
}
