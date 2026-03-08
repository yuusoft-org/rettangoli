import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const PACKAGE_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const REGISTRY_PATH = path.join(PACKAGE_ROOT, 'sites', 'contracts', 'builtin-asset-registry.yaml');
const REGISTRY_SCHEMA_PATH = path.join(PACKAGE_ROOT, 'sites', 'contracts', 'builtin-asset-registry.schema.yaml');
const DATA_CONTRACT_SCHEMA_PATH = path.join(PACKAGE_ROOT, 'sites', 'schemas', 'data-contract.schema.yaml');
const STABILITY_VALUES = new Set(['stable', 'experimental', 'deprecated']);
const GROUPS = ['templates', 'partials', 'runtimeAssets', 'themeBundles'];

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function readYamlFile(filePath, label) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = yaml.load(raw, { schema: yaml.JSON_SCHEMA });
  if (!isPlainObject(parsed)) {
    throw new Error(`${label} must contain a YAML object.`);
  }
  return parsed;
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function assertStringArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  value.forEach((entry, index) => {
    assertNonEmptyString(entry, `${label}[${index}]`);
  });
  return value;
}

function assertExistingFile(relativePath, label) {
  const absolutePath = path.join(PACKAGE_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`${label} references missing file "${relativePath}".`);
  }
}

function validateDependencyBlock(value, label, allowedIds) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const partials = value.partials ?? [];
  const runtimeAssets = value.runtimeAssets ?? [];
  assertStringArray(partials, `${label}.partials`);
  assertStringArray(runtimeAssets, `${label}.runtimeAssets`);

  partials.forEach((id) => {
    if (!allowedIds.partials.has(id)) {
      throw new Error(`${label}.partials references unknown partial id "${id}".`);
    }
  });

  runtimeAssets.forEach((id) => {
    if (!allowedIds.runtimeAssets.has(id)) {
      throw new Error(`${label}.runtimeAssets references unknown runtime asset id "${id}".`);
    }
  });
}

function collectSchemaDefNames(dataContractSchema) {
  const defs = isPlainObject(dataContractSchema.$defs) ? dataContractSchema.$defs : {};
  return new Set(Object.keys(defs).map((key) => `#/$defs/${key}`));
}

function validatePublishedAsset(entry, label, allowedIds, schemaDefNames) {
  if (!isPlainObject(entry)) {
    throw new Error(`${label} must be an object.`);
  }

  const id = assertNonEmptyString(entry.id, `${label}.id`);
  const stability = assertNonEmptyString(entry.stability, `${label}.stability`);
  if (!STABILITY_VALUES.has(stability)) {
    throw new Error(`${label}.stability must be one of: ${Array.from(STABILITY_VALUES).join(', ')}.`);
  }

  const publishedPath = assertNonEmptyString(entry.publishedPath, `${label}.publishedPath`);
  assertExistingFile(publishedPath, `${label}.publishedPath`);
  assertStringArray(entry.docsPaths, `${label}.docsPaths`).forEach((relativePath) => {
    assertExistingFile(relativePath, `${label}.docsPaths`);
  });
  assertStringArray(entry.examplePaths, `${label}.examplePaths`).forEach((relativePath) => {
    assertExistingFile(relativePath, `${label}.examplePaths`);
  });
  assertStringArray(entry.vtSpecPaths, `${label}.vtSpecPaths`).forEach((relativePath) => {
    assertExistingFile(relativePath, `${label}.vtSpecPaths`);
  });

  if (entry.schemaRef !== undefined) {
    const schemaRef = assertNonEmptyString(entry.schemaRef, `${label}.schemaRef`);
    if (!schemaDefNames.has(schemaRef)) {
      throw new Error(`${label}.schemaRef references missing data contract definition "${schemaRef}".`);
    }
  }

  validateDependencyBlock(entry.dependencies, `${label}.dependencies`, allowedIds);

  if (entry.notes !== undefined) {
    assertStringArray(entry.notes, `${label}.notes`);
  }

  return { id, publishedPath };
}

function validateRuntimeAsset(entry, label, allowedTemplateIds, allowedPartialIds) {
  if (!isPlainObject(entry)) {
    throw new Error(`${label} must be an object.`);
  }

  const id = assertNonEmptyString(entry.id, `${label}.id`);
  const stability = assertNonEmptyString(entry.stability, `${label}.stability`);
  if (!STABILITY_VALUES.has(stability)) {
    throw new Error(`${label}.stability must be one of: ${Array.from(STABILITY_VALUES).join(', ')}.`);
  }

  const publishedPath = assertNonEmptyString(entry.publishedPath, `${label}.publishedPath`);
  assertExistingFile(publishedPath, `${label}.publishedPath`);
  assertStringArray(entry.docsPaths, `${label}.docsPaths`).forEach((relativePath) => {
    assertExistingFile(relativePath, `${label}.docsPaths`);
  });

  assertStringArray(entry.consumedBy, `${label}.consumedBy`).forEach((consumerId) => {
    if (!allowedTemplateIds.has(consumerId) && !allowedPartialIds.has(consumerId)) {
      throw new Error(`${label}.consumedBy references unknown asset id "${consumerId}".`);
    }
  });

  if (entry.notes !== undefined) {
    assertStringArray(entry.notes, `${label}.notes`);
  }

  return { id, publishedPath };
}

function validateThemeBundle(entry, label) {
  if (!isPlainObject(entry)) {
    throw new Error(`${label} must be an object.`);
  }

  const id = assertNonEmptyString(entry.id, `${label}.id`);
  const stability = assertNonEmptyString(entry.stability, `${label}.stability`);
  if (!STABILITY_VALUES.has(stability)) {
    throw new Error(`${label}.stability must be one of: ${Array.from(STABILITY_VALUES).join(', ')}.`);
  }

  const publishedPath = assertNonEmptyString(entry.publishedPath, `${label}.publishedPath`);
  assertExistingFile(publishedPath, `${label}.publishedPath`);
  assertStringArray(entry.docsPaths, `${label}.docsPaths`).forEach((relativePath) => {
    assertExistingFile(relativePath, `${label}.docsPaths`);
  });
  assertStringArray(entry.classes, `${label}.classes`);
  assertStringArray(entry.vtSpecPaths, `${label}.vtSpecPaths`).forEach((relativePath) => {
    assertExistingFile(relativePath, `${label}.vtSpecPaths`);
  });

  if (entry.notes !== undefined) {
    assertStringArray(entry.notes, `${label}.notes`);
  }

  return { id, publishedPath };
}

function listPublishedFiles(relativeDir, extensions) {
  const absoluteDir = path.join(PACKAGE_ROOT, relativeDir);
  return fs.readdirSync(absoluteDir)
    .filter((fileName) => extensions.some((extension) => fileName.endsWith(extension)))
    .map((fileName) => `${relativeDir}/${fileName}`)
    .sort();
}

function assertRegisteredFilesMatch({ entries, groupLabel, relativeDir, extensions }) {
  const actualFiles = listPublishedFiles(relativeDir, extensions);
  const registeredFiles = [...entries].map((entry) => entry.publishedPath).sort();

  if (actualFiles.length !== registeredFiles.length) {
    throw new Error(`${groupLabel} registry file count does not match published files.`);
  }

  actualFiles.forEach((filePath, index) => {
    if (registeredFiles[index] !== filePath) {
      throw new Error(`${groupLabel} registry is out of sync. Expected published file "${filePath}".`);
    }
  });
}

function assertUniqueIds(entries, groupLabel) {
  const ids = new Set();
  entries.forEach((entry, index) => {
    if (ids.has(entry.id)) {
      throw new Error(`${groupLabel}[${index}] duplicates asset id "${entry.id}" within the same group.`);
    }
    ids.add(entry.id);
  });
}

export function readBuiltinAssetRegistry() {
  const registry = readYamlFile(REGISTRY_PATH, 'builtin asset registry');
  readYamlFile(REGISTRY_SCHEMA_PATH, 'builtin asset registry schema');
  const dataContractSchema = readYamlFile(DATA_CONTRACT_SCHEMA_PATH, 'data contract schema');
  const schemaDefNames = collectSchemaDefNames(dataContractSchema);

  if (registry.schemaVersion !== 1) {
    throw new Error('builtin asset registry schemaVersion must be 1.');
  }

  GROUPS.forEach((group) => {
    if (!Array.isArray(registry[group])) {
      throw new Error(`builtin asset registry missing array group "${group}".`);
    }
  });

  const partialIds = new Set(registry.partials.map((entry) => entry.id));
  const runtimeAssetIds = new Set(registry.runtimeAssets.map((entry) => entry.id));
  const templateIds = new Set(registry.templates.map((entry) => entry.id));

  const publishedTemplateEntries = registry.templates.map((entry, index) =>
    validatePublishedAsset(entry, `templates[${index}]`, { partials: partialIds, runtimeAssets: runtimeAssetIds }, schemaDefNames)
  );
  const publishedPartialEntries = registry.partials.map((entry, index) =>
    validatePublishedAsset(entry, `partials[${index}]`, { partials: partialIds, runtimeAssets: runtimeAssetIds }, schemaDefNames)
  );
  const runtimeAssetEntries = registry.runtimeAssets.map((entry, index) =>
    validateRuntimeAsset(entry, `runtimeAssets[${index}]`, templateIds, partialIds)
  );
  const themeBundleEntries = registry.themeBundles.map((entry, index) =>
    validateThemeBundle(entry, `themeBundles[${index}]`)
  );

  assertUniqueIds(registry.templates, 'templates');
  assertUniqueIds(registry.partials, 'partials');
  assertUniqueIds(registry.runtimeAssets, 'runtimeAssets');
  assertUniqueIds(registry.themeBundles, 'themeBundles');

  assertRegisteredFilesMatch({
    entries: publishedTemplateEntries,
    groupLabel: 'templates',
    relativeDir: 'sites/templates',
    extensions: ['.yaml', '.yml']
  });
  assertRegisteredFilesMatch({
    entries: publishedPartialEntries,
    groupLabel: 'partials',
    relativeDir: 'sites/partials',
    extensions: ['.yaml', '.yml']
  });
  assertRegisteredFilesMatch({
    entries: runtimeAssetEntries,
    groupLabel: 'runtimeAssets',
    relativeDir: 'sites/public',
    extensions: ['.js']
  });
  assertRegisteredFilesMatch({
    entries: themeBundleEntries,
    groupLabel: 'themeBundles',
    relativeDir: 'sites/themes',
    extensions: ['.css']
  });

  return {
    registry,
    paths: {
      packageRoot: PACKAGE_ROOT,
      registry: REGISTRY_PATH,
      registrySchema: REGISTRY_SCHEMA_PATH,
      dataContractSchema: DATA_CONTRACT_SCHEMA_PATH,
    },
  };
}
