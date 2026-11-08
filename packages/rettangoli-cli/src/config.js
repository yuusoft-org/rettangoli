import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { CliUserError } from "./errors.js";

const CONFIG_FILE = "rettangoli.config.yaml";

export function readConfig(cwd = process.cwd()) {
  const configPath = resolve(cwd, CONFIG_FILE);

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    return yaml.load(readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Error reading config file "${configPath}": ${error.message}`,
      { cause: error },
    );
  }
}

// readConfig for commands that cannot run without a config. Every failure is
// a CliUserError, so it prints without the stack trace hint.
export function requireConfig(cwd = process.cwd()) {
  let config;
  try {
    config = readConfig(cwd);
  } catch (error) {
    throw new CliUserError(error.message, { cause: error.cause });
  }

  if (!config) {
    throw new CliUserError(
      existsSync(resolve(cwd, CONFIG_FILE))
        ? `${CONFIG_FILE} is empty`
        : `${CONFIG_FILE} not found`,
    );
  }

  return config;
}
