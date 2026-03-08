import path from 'node:path';
import yaml from 'js-yaml';
import matter from 'gray-matter';

const MATTER_OPTIONS = {
  engines: {
    yaml: (source) => yaml.load(source, { schema: yaml.JSON_SCHEMA })
  }
};

export function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

export function deepMerge(target, source) {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

export function splitSystemFrontmatter(frontmatter, globalData, pagePath) {
  const normalized = isObject(frontmatter) ? { ...frontmatter } : {};
  const bindConfig = normalized._bind;
  delete normalized._bind;

  if (bindConfig === undefined) {
    return { frontmatter: normalized, bindings: {} };
  }

  if (!isObject(bindConfig)) {
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
    if (!Object.prototype.hasOwnProperty.call(globalData, sourceKey)) {
      throw new Error(`Invalid _bind in ${pagePath} for "${localKey}": global data key "${sourceKey}" not found.`);
    }

    bindings[localKey] = globalData[sourceKey];
  }

  return { frontmatter: normalized, bindings };
}

export function extractFrontmatterAndContent(fs, pagePath) {
  const pageFileContent = fs.readFileSync(pagePath, 'utf8');
  let parsed;

  try {
    parsed = matter(pageFileContent, MATTER_OPTIONS);
  } catch (error) {
    throw new Error(`Invalid frontmatter in ${pagePath}: ${error.message}`);
  }

  return {
    frontmatter: isObject(parsed.data) ? parsed.data : {},
    content: (parsed.content || '').trim()
  };
}

export function relativePagePathToUrl(relativePagePath) {
  const normalizedPath = relativePagePath.replace(/\\/g, '/');
  const extension = path.extname(normalizedPath);
  const withoutExtension = normalizedPath.slice(0, normalizedPath.length - extension.length);

  if (path.basename(withoutExtension) === 'index') {
    const parentDir = path.dirname(withoutExtension).replace(/\\/g, '/');
    if (!parentDir || parentDir === '.') {
      return '/';
    }
    return `/${parentDir}/`;
  }

  return `/${withoutExtension.replace(/\\/g, '/')}/`;
}
