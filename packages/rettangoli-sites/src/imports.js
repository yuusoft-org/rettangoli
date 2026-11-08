import path from 'path';
import { createHash } from 'crypto';
import yaml from 'js-yaml';

import { parseYamlWithContext } from './sources.js';
import { isPlainObject } from './utils/object.js';

function buildImportCacheHash(url) {
  return createHash('sha256').update(url).digest('hex');
}

function buildImportCachePath(rootDir, importGroup, hash) {
  return path.join(rootDir, '.rettangoli', 'sites', 'imports', importGroup, `${hash}.yaml`);
}

function buildImportIndexPath(rootDir) {
  return path.join(rootDir, '.rettangoli', 'sites', 'imports', 'index.yaml');
}

function toRelativePath(rootDir, absolutePath) {
  const relativePath = path.relative(rootDir, absolutePath);
  return relativePath.replace(/\\/g, '/');
}

// The index lists the configured template and partial imports. Nothing reads it back, so it is
// rebuilt on every build, written only when its text changes, and a failed write only warns.
export function writeImportIndex(fs, rootDir, entries) {
  const indexPath = buildImportIndexPath(rootDir);
  const sortedEntries = [...entries].sort((a, b) => {
    const left = `${a.type}:${a.alias}`;
    const right = `${b.type}:${b.alias}`;
    return left.localeCompare(right);
  });
  const content = yaml.dump({ version: 1, entries: sortedEntries }, { noRefs: true, lineWidth: -1 });

  try {
    if (fs.existsSync(indexPath) && fs.readFileSync(indexPath, 'utf8') === content) {
      return;
    }

    const indexDir = path.dirname(indexPath);
    if (!fs.existsSync(indexDir)) {
      fs.mkdirSync(indexDir, { recursive: true });
    }
    fs.writeFileSync(indexPath, content);
  } catch (error) {
    console.warn(`Could not write import index ${indexPath}: ${error.message}`);
  }
}

function readImportedYamlFromCache(fs, cachePath, aliasLabel) {
  if (!fs.existsSync(cachePath)) {
    return null;
  }

  const content = fs.readFileSync(cachePath, 'utf8');
  return parseYamlWithContext(content, `${aliasLabel} (cache: ${cachePath})`);
}

// Errors carry no alias label: the callers add "Failed to load <alias label>: " once.
async function fetchRemoteYaml(url, fetchImpl, requestOptions) {
  const effectiveFetch = fetchImpl || globalThis.fetch;
  if (typeof effectiveFetch !== 'function') {
    throw new Error('Remote imports require global fetch support (Node.js 18+).');
  }

  const response = await effectiveFetch(url, requestOptions);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
  }

  const content = await response.text();
  let parsed;
  try {
    parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    throw new Error(`Invalid YAML: ${error.message}`, { cause: error });
  }
  return { parsed, content };
}

function writeImportedYamlCache(fs, cachePath, content) {
  try {
    const cacheDir = path.dirname(cachePath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(cachePath, content);
  } catch (error) {
    // Non-fatal: build can still proceed with fetched content.
  }
}

export async function loadImportedAliases({
  fs,
  rootDir,
  importMap,
  importGroup,
  typeLabel,
  fetchImpl
}) {
  const resolved = {};
  const entries = [];
  if (!isPlainObject(importMap)) {
    return { resolved, entries };
  }

  for (const [alias, url] of Object.entries(importMap)) {
    const aliasLabel = `imported ${typeLabel} "${alias}" from "${url}"`;
    const hash = buildImportCacheHash(url);
    const cachePath = buildImportCachePath(rootDir, importGroup, hash);
    entries.push({ alias, type: typeLabel, url, hash, path: toRelativePath(rootDir, cachePath) });

    const cachedValue = readImportedYamlFromCache(fs, cachePath, aliasLabel);
    if (cachedValue !== null) {
      resolved[alias] = cachedValue;
      continue;
    }

    try {
      const fetched = await fetchRemoteYaml(url, fetchImpl);
      writeImportedYamlCache(fs, cachePath, fetched.content);
      resolved[alias] = fetched.parsed;
    } catch (error) {
      throw new Error(`Failed to load ${aliasLabel}: ${error.message}`, { cause: error });
    }
  }

  return { resolved, entries };
}

export async function loadImportedData(importMap, fetchImpl) {
  const resolved = Object.create(null);
  if (!isPlainObject(importMap)) {
    return resolved;
  }

  for (const [alias, url] of Object.entries(importMap)) {
    const aliasLabel = `imported data "${alias}" from "${url}"`;
    try {
      // Catalog data must be fresh on every build, including watch rebuilds.
      const { parsed } = await fetchRemoteYaml(url, fetchImpl, {
        cache: 'no-store',
        signal: AbortSignal.timeout(30_000)
      });
      resolved[alias] = parsed;
    } catch (error) {
      throw new Error(`Failed to load ${aliasLabel}: ${error.message}`, { cause: error });
    }
  }

  return resolved;
}
