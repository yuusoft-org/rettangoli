import path from "node:path";
import { walkFiles, isDirectoryPath } from "../utils/fs.js";

const FILE_SUFFIX_MAP = [
  [".view.yaml", "view"],
  [".schema.yaml", "schema"],
  [".store.js", "store"],
  [".handlers.js", "handlers"],
  [".methods.js", "methods"],
  [".constants.yaml", "constants"],
];

export const SUPPORTED_FILE_SUFFIXES = FILE_SUFFIX_MAP.map(([suffix]) => suffix);

const detectFileType = (filePath) => {
  for (const [suffix, fileType] of FILE_SUFFIX_MAP) {
    if (filePath.endsWith(suffix)) {
      return { suffix, fileType };
    }
  }
  return null;
};

export const resolveDirs = ({ cwd = process.cwd(), dirs = [] }) => {
  return dirs
    .map((dirPath) => path.resolve(cwd, dirPath))
    .filter((dirPath) => isDirectoryPath(dirPath));
};

export const discoverComponentEntries = ({ cwd = process.cwd(), dirs = [] }) => {
  const resolvedDirs = resolveDirs({ cwd, dirs });
  const allFiles = walkFiles(resolvedDirs);
  const supportedEntries = [];

  allFiles.forEach((filePath) => {
    const fileTypeInfo = detectFileType(filePath);
    if (!fileTypeInfo) {
      return;
    }

    const normalizedPath = path.resolve(filePath);
    const fileName = path.basename(normalizedPath);
    const componentDir = path.basename(path.dirname(normalizedPath));
    const categoryDir = path.basename(path.dirname(path.dirname(normalizedPath)));
    const componentNameFromFile = fileName.slice(0, -fileTypeInfo.suffix.length);

    supportedEntries.push({
      filePath: normalizedPath,
      fileName,
      fileType: fileTypeInfo.fileType,
      category: categoryDir,
      component: componentDir,
      componentNameFromFile,
      componentKey: `${categoryDir}/${componentDir}`,
    });
  });

  return {
    resolvedDirs,
    allFiles,
    entries: supportedEntries,
  };
};

export const groupEntriesByComponent = (entries = []) => {
  const byComponent = new Map();

  entries.forEach((entry) => {
    const existing = byComponent.get(entry.componentKey) || {
      componentKey: entry.componentKey,
      category: entry.category,
      component: entry.component,
      files: {},
      entries: [],
    };

    existing.files[entry.fileType] = entry.filePath;
    existing.entries.push(entry);
    byComponent.set(entry.componentKey, existing);
  });

  return [...byComponent.values()];
};
