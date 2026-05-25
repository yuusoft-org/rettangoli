import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { load as loadYaml } from "js-yaml";

const DEFAULT_OUTPUT_DIR = "i18n";
const LOCALE_PATTERN = /^[A-Za-z0-9_-]+$/;

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const toPosixPath = (value) => value.split(path.sep).join("/");

const createI18nError = ({ code = "RTGL-I18N-004", message, filePath }) => ({
  code,
  message,
  filePath: filePath || "",
});

const assertNoI18nErrors = ({ errors, errorPrefix }) => {
  if (errors.length === 0) {
    return;
  }

  const details = errors
    .map((error) => `${error.code} ${error.message}${error.filePath ? ` [${error.filePath}]` : ""}`)
    .join("\n");
  throw new Error(`${errorPrefix} i18n validation failed:\n${details}`);
};

const validateLocaleName = ({ locale, errors, filePath }) => {
  if (typeof locale !== "string" || !LOCALE_PATTERN.test(locale)) {
    errors.push(createI18nError({
      message: `invalid locale name ${JSON.stringify(locale)}. Locale names may contain letters, numbers, "_" and "-".`,
      filePath,
    }));
    return false;
  }
  return true;
};

const flattenCatalogKeys = (catalog = {}) => {
  const keys = [];
  Object.entries(catalog).forEach(([namespace, messages]) => {
    Object.keys(messages || {}).forEach((key) => {
      keys.push(`${namespace}.${key}`);
    });
  });
  return keys.sort();
};

const validateCatalog = ({ catalog, locale, filePath }) => {
  const errors = [];
  const normalized = {};

  if (!isPlainObject(catalog)) {
    errors.push(createI18nError({
      message: `${locale}.yaml must contain a YAML object at the root.`,
      filePath,
    }));
    return { catalog: normalized, errors };
  }

  Object.entries(catalog).forEach(([namespace, messages]) => {
    if (!isPlainObject(messages)) {
      errors.push(createI18nError({
        message: `${locale}.yaml namespace "${namespace}" must be an object. Use namespace -> key -> content.`,
        filePath,
      }));
      return;
    }

    normalized[namespace] = {};
    Object.entries(messages).forEach(([key, content]) => {
      if (isPlainObject(content) || Array.isArray(content)) {
        errors.push(createI18nError({
          message: `${locale}.yaml key "${namespace}.${key}" is nested too deeply. Use namespace -> key -> content only.`,
          filePath,
        }));
        return;
      }

      if (typeof content !== "string") {
        errors.push(createI18nError({
          message: `${locale}.yaml key "${namespace}.${key}" must be a string.`,
          filePath,
        }));
        return;
      }

      normalized[namespace][key] = content;
    });
  });

  return { catalog: normalized, errors };
};

const normalizeI18nConfig = ({ cwd, i18n }) => {
  const errors = [];

  if (!i18n) {
    return {
      config: { enabled: false },
      errors,
    };
  }

  if (!isPlainObject(i18n)) {
    errors.push(createI18nError({
      message: "fe.i18n must be an object.",
    }));
    return {
      config: { enabled: false },
      errors,
    };
  }

  const dir = i18n.dir;
  if (typeof dir !== "string" || dir.trim() === "") {
    errors.push(createI18nError({
      message: "fe.i18n.dir must be a non-empty string.",
    }));
  }

  const defaultLocale = i18n.defaultLocale;
  const fallbackLocale = i18n.fallbackLocale;
  validateLocaleName({ locale: defaultLocale, errors });
  validateLocaleName({ locale: fallbackLocale, errors });

  if (!Array.isArray(i18n.locales) || i18n.locales.length === 0) {
    errors.push(createI18nError({
      message: "fe.i18n.locales must be a non-empty array.",
    }));
  }

  const locales = [];
  const seen = new Set();
  if (Array.isArray(i18n.locales)) {
    i18n.locales.forEach((locale) => {
      if (!validateLocaleName({ locale, errors })) {
        return;
      }
      if (seen.has(locale)) {
        errors.push(createI18nError({
          message: `fe.i18n.locales contains duplicate locale "${locale}".`,
        }));
        return;
      }
      seen.add(locale);
      locales.push(locale);
    });
  }

  if (defaultLocale && locales.length > 0 && !seen.has(defaultLocale)) {
    errors.push(createI18nError({
      message: `fe.i18n.defaultLocale "${defaultLocale}" must be listed in fe.i18n.locales.`,
    }));
  }

  if (fallbackLocale && locales.length > 0 && !seen.has(fallbackLocale)) {
    errors.push(createI18nError({
      message: `fe.i18n.fallbackLocale "${fallbackLocale}" must be listed in fe.i18n.locales.`,
    }));
  }

  const outputDir = typeof i18n.outputDir === "string" && i18n.outputDir.trim()
    ? i18n.outputDir
    : DEFAULT_OUTPUT_DIR;
  const normalizedOutputDir = outputDir.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (
    !normalizedOutputDir ||
    normalizedOutputDir.split("/").includes("..") ||
    path.posix.isAbsolute(normalizedOutputDir)
  ) {
    errors.push(createI18nError({
      message: "fe.i18n.outputDir must be a relative path when provided.",
    }));
  }

  return {
    config: {
      enabled: errors.length === 0,
      dir,
      resolvedDir: dir ? path.resolve(cwd, dir) : null,
      outputDir: normalizedOutputDir || DEFAULT_OUTPUT_DIR,
      defaultLocale,
      fallbackLocale,
      locales,
    },
    errors,
  };
};

export const analyzeI18nBuildContext = ({
  cwd = process.cwd(),
  i18n = null,
} = {}) => {
  const { config, errors } = normalizeI18nConfig({ cwd, i18n });

  if (!i18n || errors.length > 0) {
    return {
      context: { enabled: false },
      errors,
    };
  }

  if (!existsSync(config.resolvedDir)) {
    errors.push(createI18nError({
      message: `fe.i18n.dir does not exist: ${config.resolvedDir}`,
      filePath: config.resolvedDir,
    }));
    return {
      context: { enabled: false },
      errors,
    };
  }

  const localeFiles = {};
  const catalogs = {};

  config.locales.forEach((locale) => {
    const filePath = path.join(config.resolvedDir, `${locale}.yaml`);
    localeFiles[locale] = filePath;

    if (!existsSync(filePath)) {
      errors.push(createI18nError({
        message: `missing i18n file for locale "${locale}". Expected ${filePath}.`,
        filePath,
      }));
      return;
    }

    let yamlObject;
    try {
      yamlObject = loadYaml(readFileSync(filePath, "utf8")) ?? {};
    } catch (error) {
      errors.push(createI18nError({
        message: `failed to parse ${locale}.yaml: ${error.message}`,
        filePath,
      }));
      return;
    }

    const result = validateCatalog({ catalog: yamlObject, locale, filePath });
    errors.push(...result.errors);
    catalogs[locale] = result.catalog;
  });

  const defaultCatalog = catalogs[config.defaultLocale];
  if (defaultCatalog) {
    const defaultKeys = flattenCatalogKeys(defaultCatalog);
    config.locales.forEach((locale) => {
      if (locale === config.defaultLocale || !catalogs[locale]) {
        return;
      }

      defaultKeys.forEach((fullKey) => {
        const [namespace, key] = fullKey.split(".");
        if (
          !Object.prototype.hasOwnProperty.call(catalogs[locale] || {}, namespace) ||
          !Object.prototype.hasOwnProperty.call(catalogs[locale]?.[namespace] || {}, key)
        ) {
          errors.push(createI18nError({
            message: `${locale}.yaml is missing key "${fullKey}" from default locale "${config.defaultLocale}".`,
            filePath: localeFiles[locale],
          }));
        }
      });
    });
  }

  const context = {
    ...config,
    enabled: errors.length === 0,
    localeFiles,
    catalogs,
  };

  return {
    context,
    errors,
  };
};

export const loadI18nBuildContext = ({
  cwd = process.cwd(),
  i18n = null,
  errorPrefix = "[Build]",
} = {}) => {
  const { context, errors } = analyzeI18nBuildContext({ cwd, i18n });
  assertNoI18nErrors({ errors, errorPrefix });
  return context;
};

export const buildI18nAssets = ({ i18nContext }) => {
  if (!i18nContext?.enabled) {
    return [];
  }

  return i18nContext.locales.map((locale) => {
    const relativeFileName = path.posix.join(
      i18nContext.outputDir,
      `${locale}.json`,
    );
    return {
      locale,
      relativeFileName,
      sourcePath: i18nContext.localeFiles[locale],
      catalog: i18nContext.catalogs[locale],
      content: `${JSON.stringify(i18nContext.catalogs[locale], null, 2)}\n`,
    };
  });
};

export const emitI18nAssets = ({ outDir, i18nContext }) => {
  const assets = buildI18nAssets({ i18nContext });

  return assets.map((asset) => {
    const outputPath = path.resolve(outDir, asset.relativeFileName);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, asset.content);
    return {
      ...asset,
      outputPath,
    };
  });
};

export const isI18nSourceFilePath = ({ filePath, i18nContext }) => {
  if (!i18nContext?.enabled && !i18nContext?.resolvedDir) {
    return false;
  }

  const resolvedFilePath = path.resolve(filePath);
  const extension = path.extname(resolvedFilePath);
  if (extension !== ".yaml") {
    return false;
  }

  const relativePath = path.relative(i18nContext.resolvedDir, resolvedFilePath);
  return (
    relativePath !== "" &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  );
};

export const getI18nPublicAssetPath = ({
  publicEntryPath,
  relativeFileName,
}) => {
  const normalizedEntry = publicEntryPath
    ? publicEntryPath.replace(/\\/g, "/")
    : "/main.js";
  const entryPath = normalizedEntry.startsWith("/")
    ? normalizedEntry
    : `/${normalizedEntry}`;
  return path.posix.join(
    path.posix.dirname(entryPath),
    toPosixPath(relativeFileName),
  );
};
