import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { CliUserError } from "./errors.js";

function describeType(value) {
  if (value === null) return "null";
  return Array.isArray(value) ? "array" : typeof value;
}

// Copies the fe section of the config into the options of `fe build`,
// `fe check` or `fe watch` (command: "build" | "check" | "watch"). Command-line
// options win over config values. Only values that would crash later are
// rejected here.
export function resolveFeOptions(config, cwd, options, { command }) {
  const dirs = config.fe?.dirs;
  if (!dirs?.length) {
    throw new CliUserError("fe.dirs not found or empty in config");
  }
  if (!Array.isArray(dirs)) {
    throw new CliUserError(
      "fe.dirs must be a list of directories, for example dirs: [src/components]",
    );
  }
  dirs.forEach((dir, index) => {
    if (typeof dir !== "string") {
      throw new CliUserError(
        `fe.dirs entries must be strings (got ${describeType(dir)} at index ${index})`,
      );
    }
  });

  const missingDirs = dirs.filter((dir) => !existsSync(resolve(cwd, dir)));
  if (missingDirs.length > 0) {
    throw new CliUserError(`Directories do not exist: ${missingDirs.join(", ")}`);
  }

  options.dirs = dirs;
  options.i18n = config.fe.i18n || null;
  if (command === "check") {
    return options;
  }

  // Use setup-path if provided, otherwise use config setup
  options.setup = options.setupPath || config.fe.setup || "setup.js";
  // Use config outfile if not specified via CLI option
  if (!options.outfile && config.fe.outfile) {
    options.outfile = config.fe.outfile;
  }
  if (command === "watch") {
    if (options.publicDir === undefined && config.fe.publicDir !== undefined) {
      options.publicDir = config.fe.publicDir;
    }
    if (options.watchEntry === undefined && config.fe.watchEntry !== undefined) {
      options.watchEntry = config.fe.watchEntry;
    }
  }

  // A non-string outfile crashes fe before it prints anything. fe.setup and
  // fe.watchEntry are not checked: fe prints progress before they crash.
  if (options.outfile && typeof options.outfile !== "string") {
    throw new CliUserError(
      `fe.outfile must be a file path string (got ${describeType(options.outfile)})`,
    );
  }

  return options;
}
