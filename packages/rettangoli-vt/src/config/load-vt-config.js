import { readYaml } from "../common.js";
import { validateVtConfig } from "../validation.js";

// Reads rettangoli.config.yaml and returns its validated "vt" section. The CLI passes a relative
// path with wrapReadError (`Unable to read "<path>": ...`); watch passes an absolute path and gets
// read and parse errors unwrapped.
export async function readVtConfig(configPath, { wrapReadError = false } = {}) {
  let mainConfig;
  try {
    mainConfig = await readYaml(configPath);
  } catch (error) {
    if (!wrapReadError) {
      throw error;
    }
    throw new Error(`Unable to read "${configPath}": ${error.message}`, { cause: error });
  }

  if (!mainConfig?.vt) {
    throw new Error(`Invalid "${configPath}": missing required "vt" section.`);
  }
  return validateVtConfig(mainConfig.vt, configPath);
}
