import { readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, join, sep } from "node:path";

// Every file under `dirPaths`, depth first in readdir order. Symlinks are
// followed, except a dangling one or one back to a directory the walk is
// already inside. A missing root still throws.
export function getAllFiles(dirPaths, arrayOfFiles = []) {
  const ancestors = new Set();

  const walk = (dirPath) => {
    // readdir first, so a missing root throws the same "scandir" error.
    const files = readdirSync(dirPath);
    const realDirPath = realpathSync(dirPath);
    if (ancestors.has(realDirPath)) {
      return;
    }
    ancestors.add(realDirPath);

    files.forEach((file) => {
      const fullPath = join(dirPath, file);
      let stats;
      try {
        stats = statSync(fullPath);
      } catch (error) {
        if (error.code === "ENOENT") {
          return;
        }
        throw error;
      }
      if (stats.isDirectory()) {
        walk(fullPath);
      } else {
        arrayOfFiles.push(fullPath);
      }
    });

    ancestors.delete(realDirPath);
  };

  dirPaths.forEach(walk);
  return arrayOfFiles;
}

export const extractCategoryAndComponent = (filePath) => {
  const parts = filePath.split(sep);
  const component = parts[parts.length - 1].split(".")[0];
  const category = parts[parts.length - 3];
  const fileType = parts[parts.length - 1].split(".")[1];
  return { category, component, fileType };
}

// Component ids (`category/component`) whose files come from more than one
// folder. Their files are merged into one component today, so callers warn.
export const findDuplicateComponentIds = (filePaths) => {
  const ownersById = new Map();
  for (const filePath of filePaths) {
    const { category, component } = extractCategoryAndComponent(filePath);
    const id = `${category}/${component}`;
    if (!ownersById.has(id)) {
      ownersById.set(id, new Set());
    }
    ownersById.get(id).add(join(dirname(filePath), component));
  }
  return [...ownersById]
    .filter(([, owners]) => owners.size > 1)
    .map(([id, owners]) => ({ id, owners: [...owners] }));
};

export const warnDuplicateComponentIds = ({ filePaths, errorPrefix }) => {
  for (const { id, owners } of findDuplicateComponentIds(filePaths)) {
    console.warn(
      `${errorPrefix} component id "${id}" is defined in ${owners.join(" and ")}; their files are merged and later files win.`,
    );
  }
};
