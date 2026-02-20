import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import { isDirectoryPath } from "../utils/fs.js";
import { EXIT_CODE_MATRIX } from "./exitCodes.js";
import {
  DEFAULT_LANGUAGE_LEVEL,
  isKnownLanguageLevel,
  LANGUAGE_LEVELS,
  resolveLanguageLevelTransition,
} from "./languageLevels.js";

const readConfig = (cwd) => {
  const configPath = path.resolve(cwd, "rettangoli.config.yaml");
  if (!existsSync(configPath)) {
    return {
      configPath,
      config: null,
    };
  }

  try {
    const content = readFileSync(configPath, "utf8");
    return {
      configPath,
      config: loadYaml(content),
    };
  } catch (error) {
    throw new Error(`Failed to parse rettangoli.config.yaml: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const resolveDirs = ({ dirs = [], config }) => {
  if (Array.isArray(dirs) && dirs.length > 0) {
    return dirs;
  }
  const configured = config?.fe?.dirs;
  if (Array.isArray(configured) && configured.length > 0) {
    return configured;
  }
  return ["./src/components"];
};

export const doctor = async (options = {}) => {
  const {
    cwd = process.cwd(),
    format = "text",
    dirs = [],
  } = options;

  const { configPath, config } = readConfig(cwd);
  const resolvedDirs = resolveDirs({ dirs, config });
  const dirChecks = resolvedDirs.map((dirPath) => ({
    dir: dirPath,
    exists: isDirectoryPath(path.resolve(cwd, dirPath)),
  }));
  const missingDirs = dirChecks.filter((entry) => !entry.exists);
  const configuredLanguageLevel = typeof config?.language?.level === "string"
    ? config.language.level.trim()
    : null;
  const resolvedLanguageLevel = configuredLanguageLevel || DEFAULT_LANGUAGE_LEVEL;
  const languageLevelKnown = isKnownLanguageLevel(resolvedLanguageLevel);

  const payload = {
    contractVersion: 1,
    ok: missingDirs.length === 0 && languageLevelKnown,
    command: "doctor",
    cwd,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    config: {
      exists: config !== null,
      path: path.relative(cwd, configPath) || "rettangoli.config.yaml",
    },
    language: {
      configured: configuredLanguageLevel,
      resolved: resolvedLanguageLevel,
      known: languageLevelKnown,
      supportedLevels: LANGUAGE_LEVELS,
      transitionFromDefault: resolveLanguageLevelTransition({
        fromLevel: DEFAULT_LANGUAGE_LEVEL,
        toLevel: languageLevelKnown ? resolvedLanguageLevel : DEFAULT_LANGUAGE_LEVEL,
      }),
    },
    dirs: dirChecks,
    exitCodeMatrix: EXIT_CODE_MATRIX,
  };

  process.exitCode = payload.ok ? 0 : 1;

  if (format === "json") {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`[Doctor] node=${payload.nodeVersion} platform=${payload.platform} arch=${payload.arch}`);
    console.log(`[Doctor] config=${payload.config.exists ? "present" : "missing"} (${payload.config.path})`);
    console.log(`[Doctor] language level=${payload.language.resolved} (${payload.language.known ? "supported" : "unsupported"})`);
    payload.dirs.forEach((entry) => {
      console.log(`[Doctor] dir ${entry.exists ? "ok" : "missing"}: ${entry.dir}`);
    });
    if (!payload.language.known) {
      console.log(`[Doctor] Unknown language level in config. Supported: ${payload.language.supportedLevels.join(", ")}`);
    }
    if (!payload.ok) {
      console.log("[Doctor] Missing component directories detected.");
    } else {
      console.log("[Doctor] Environment looks healthy.");
    }
  }

  return payload;
};

export default doctor;
