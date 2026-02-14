import { readdirSync, statSync } from "node:fs";
import path from "node:path";

export const isDirectoryPath = (targetPath) => {
  try {
    return statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
};

export const walkFiles = (dirPaths = [], output = []) => {
  dirPaths.forEach((dirPath) => {
    if (!isDirectoryPath(dirPath)) {
      return;
    }

    const entries = readdirSync(dirPath);
    entries.forEach((entry) => {
      const fullPath = path.join(dirPath, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        walkFiles([fullPath], output);
        return;
      }
      output.push(fullPath);
    });
  });
  return output;
};
