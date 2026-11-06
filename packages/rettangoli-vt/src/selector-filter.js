import path from "path";
import { stripViewportSuffix, VIEWPORT_ID_PATTERN } from "./viewport.js";
import { deriveSectionPageKey } from "./section-page-key.js";

function toList(value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function normalizePathValue(value) {
  return String(value)
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .replace(/\/+$/, "");
}

function normalizeItemKey(value) {
  const normalized = normalizePathValue(value);
  return normalized.replace(/\.(html?|ya?ml|md)$/i, "");
}

export function normalizeSelectors(raw = {}) {
  const folders = toList(raw.folder)
    .map(normalizePathValue)
    .filter((item) => item.length > 0);
  const groups = toList(raw.group)
    .map((item) => deriveSectionPageKey({ title: String(item) }))
    .filter((item) => item.length > 0);
  const items = toList(raw.item)
    .map(normalizeItemKey)
    .filter((item) => item.length > 0);

  return {
    folders: [...new Set(folders)],
    groups: [...new Set(groups)],
    items: [...new Set(items)],
  };
}

export function hasSelectors(selectors) {
  return (
    selectors.folders.length > 0
    || selectors.groups.length > 0
    || selectors.items.length > 0
  );
}

function matchesFolderPrefix(filePath, folderPrefix) {
  return filePath === folderPrefix || filePath.startsWith(`${folderPrefix}/`);
}

export function resolveGroupFolders(configSections = [], groupSelectors = []) {
  if (groupSelectors.length === 0) {
    return [];
  }

  const groupFolderMap = new Map();
  for (const section of configSections) {
    if (section.type === "groupLabel" && Array.isArray(section.items)) {
      for (const item of section.items) {
        groupFolderMap.set(deriveSectionPageKey(item), normalizePathValue(item.files));
      }
      continue;
    }
    if (section.files) {
      groupFolderMap.set(deriveSectionPageKey(section), normalizePathValue(section.files));
    }
  }

  const missing = [];
  const folders = [];
  for (const selector of groupSelectors) {
    const folder = groupFolderMap.get(selector);
    if (!folder) {
      missing.push(selector);
      continue;
    }
    folders.push(folder);
  }
  if (missing.length > 0) {
    throw new Error(
      `Unknown group selector(s): ${missing.join(", ")}.`,
    );
  }
  return [...new Set(folders)];
}

function toGeneratedFileItemKey(filePath) {
  const normalized = normalizePathValue(filePath);
  const ext = path.extname(normalized);
  return normalized.slice(0, normalized.length - ext.length);
}

export function filterGeneratedFilesBySelectors(generatedFiles, selectors, configSections = []) {
  if (!hasSelectors(selectors)) {
    return generatedFiles;
  }

  const folderSelectors = [
    ...selectors.folders,
    ...resolveGroupFolders(configSections, selectors.groups),
  ];

  return generatedFiles.filter((file) => {
    const normalizedPath = normalizePathValue(file.path);
    const itemKey = toGeneratedFileItemKey(normalizedPath);

    if (selectors.items.includes(itemKey)) {
      return true;
    }
    return folderSelectors.some((folder) => matchesFolderPrefix(normalizedPath, folder));
  });
}

// The --folder and --item selectors that select nothing on their own, as `--folder "x"` labels.
// `selectsAny(selectors)` applies one single-selector set to the caller's paths.
export function findUnmatchedSelectors(selectors, selectsAny) {
  const single = (overrides) => ({ folders: [], groups: [], items: [], ...overrides });
  return [
    ...selectors.folders
      .filter((folder) => !selectsAny(single({ folders: [folder] })))
      .map((folder) => `--folder "${folder}"`),
    ...selectors.items
      .filter((item) => !selectsAny(single({ items: [item] })))
      .map((item) => `--item "${item}"`),
  ];
}

// Maps a screenshot path ("pages/btn--mobile-01.webp") back to its spec key ("pages/btn").
// `specKeys` (a Set of spec paths without extension) lets spec names that contain "--" keep their
// own key: the name itself wins, then the right-most "--<viewportId>" split that names a spec.
// Without a matching spec key, any trailing "--<viewportId>" is stripped.
export function toScreenshotItemKey(relativeScreenshotPath, specKeys) {
  const normalized = normalizePathValue(relativeScreenshotPath).replace(/\.webp$/i, "");
  const withoutOrdinal = normalized.replace(/-\d{1,3}$/i, "");
  if (specKeys) {
    if (specKeys.has(withoutOrdinal)) {
      return withoutOrdinal;
    }
    for (
      let index = withoutOrdinal.lastIndexOf("--");
      index > 0;
      index = withoutOrdinal.lastIndexOf("--", index - 1)
    ) {
      const prefix = withoutOrdinal.slice(0, index);
      if (specKeys.has(prefix) && VIEWPORT_ID_PATTERN.test(withoutOrdinal.slice(index + 2))) {
        return prefix;
      }
    }
  }
  return stripViewportSuffix(withoutOrdinal);
}

export function filterRelativeScreenshotPathsBySelectors(
  relativePaths,
  selectors,
  configSections = [],
  specKeys = undefined,
) {
  if (!hasSelectors(selectors)) {
    return relativePaths;
  }

  const folderSelectors = [
    ...selectors.folders,
    ...resolveGroupFolders(configSections, selectors.groups),
  ];

  return relativePaths.filter((relativePath) => {
    const itemKey = toScreenshotItemKey(relativePath, specKeys);
    if (selectors.items.includes(itemKey)) {
      return true;
    }
    return folderSelectors.some((folder) => matchesFolderPrefix(itemKey, folder));
  });
}
