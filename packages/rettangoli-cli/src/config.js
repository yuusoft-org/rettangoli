import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";

export function readConfig(cwd = process.cwd()) {
  const configPath = resolve(cwd, "rettangoli.config.yaml");

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
