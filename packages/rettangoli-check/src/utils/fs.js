import { readdirSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

export const isDirectoryPath = (targetPath) => {
  try {
    return statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
};

// A dangling symlink (ENOENT) or a link cycle the OS refuses to follow (ELOOP) is skipped.
const isBrokenLinkError = (error) => error?.code === "ENOENT" || error?.code === "ELOOP";

// Symlinked files and directories are followed. A directory whose real path is already on the
// current recursion stack, which starts with the real ancestors of the walked root (a link back
// to an ancestor), is skipped, so loops terminate; the same directory reached through two
// different links is still walked once per link.
const walkDirectory = (dirPath, ancestorRealPaths, output) => {
  const realDirPath = realpathSync(dirPath);
  if (ancestorRealPaths.has(realDirPath)) {
    return;
  }
  ancestorRealPaths.add(realDirPath);

  readdirSync(dirPath).forEach((entry) => {
    const fullPath = path.join(dirPath, entry);
    let stats;
    try {
      stats = statSync(fullPath);
    } catch (error) {
      if (isBrokenLinkError(error)) {
        return;
      }
      throw error;
    }
    if (stats.isDirectory()) {
      walkDirectory(fullPath, ancestorRealPaths, output);
      return;
    }
    output.push(fullPath);
  });

  ancestorRealPaths.delete(realDirPath);
};

export const walkFiles = (dirPaths = [], output = []) => {
  dirPaths.forEach((dirPath) => {
    if (!isDirectoryPath(dirPath)) {
      return;
    }
    const rootAncestors = new Set();
    let ancestor = path.dirname(realpathSync(dirPath));
    while (!rootAncestors.has(ancestor)) {
      rootAncestors.add(ancestor);
      ancestor = path.dirname(ancestor);
    }
    walkDirectory(dirPath, rootAncestors, output);
  });
  return output;
};
