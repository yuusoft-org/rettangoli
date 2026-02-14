import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const getAllFiles = (dirPaths = [], files = []) => {
  dirPaths.forEach((dirPath) => {
    const entries = readdirSync(dirPath);

    entries.forEach((entry) => {
      const fullPath = path.join(dirPath, entry);
      if (statSync(fullPath).isDirectory()) {
        getAllFiles([fullPath], files);
      } else {
        files.push(fullPath);
      }
    });
  });

  return files;
};
