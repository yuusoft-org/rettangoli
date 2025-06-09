
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";


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