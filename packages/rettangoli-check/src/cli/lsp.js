import path from "node:path";
import { isDirectoryPath } from "../utils/fs.js";
import { runLspServer } from "../lsp/server.js";

export const lsp = async (options = {}) => {
  const {
    cwd = process.cwd(),
    dirs = [],
  } = options;

  const resolvedDirs = Array.isArray(dirs) && dirs.length > 0 ? dirs : ["./src/components"];
  const missingDirs = resolvedDirs.filter((dirPath) => !isDirectoryPath(path.resolve(cwd, dirPath)));
  if (missingDirs.length > 0) {
    throw new Error(`Component directories do not exist: ${missingDirs.join(", ")}`);
  }

  await runLspServer({
    cwd,
    dirs: resolvedDirs,
    input: process.stdin,
    output: process.stdout,
  });
};

export default lsp;
