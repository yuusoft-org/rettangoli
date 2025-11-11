
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { sep } from 'node:path';
// Function to recursively get all files in a directory
export function getAllFiles(dirPaths, arrayOfFiles = []) {
  dirPaths.forEach((dirPath) => {
    const files = readdirSync(dirPath);

    files.forEach((file) => {
      const fullPath = join(dirPath, file);
      if (statSync(fullPath).isDirectory()) {
        arrayOfFiles = getAllFiles([fullPath], arrayOfFiles);
      } else {
        arrayOfFiles.push(fullPath);
      }
    });
  });

  return arrayOfFiles;
}

export const extractCategoryAndComponent = (filePath) => {
  const parts = filePath.split(sep);
  const component = parts[parts.length - 1].split(".")[0];
  const category = parts[parts.length - 3];
  const fileType = parts[parts.length - 1].split(".")[1];
  return { category, component, fileType };
}