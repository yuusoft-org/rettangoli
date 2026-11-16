import { getLocaleDirection } from "../i18n/direction.js";

const getDefaultFetch = () => {
  if (typeof globalThis !== "undefined" && typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }
  return null;
};

const normalizeAvailableLocales = (locales = []) => [...new Set(locales)];

const createUnknownLocaleError = ({ locale, availableLocales }) => {
  return new Error(
    `[i18n] Unknown locale "${locale}". Available locales: ${availableLocales.join(", ")}.`,
  );
};

export const createI18nRuntime = ({
  defaultLocale,
  fallbackLocale = defaultLocale,
  locales = [],
  urls = {},
  initialCatalogs = {},
  fetchFn = getDefaultFetch(),
  documentElement = globalThis.document?.documentElement,
} = {}) => {
  const availableLocales = normalizeAvailableLocales(locales);
  const catalogs = new Map(Object.entries(initialCatalogs || {}));
  const listeners = new Set();
  let currentLocale = defaultLocale || fallbackLocale || availableLocales[0] || null;
  let catalogGeneration = 0;
  let localeRequestVersion = 0;

  const assertKnownLocale = (locale) => {
    if (!availableLocales.includes(locale)) {
      throw createUnknownLocaleError({ locale, availableLocales });
    }
  };

  const getMessages = () => {
    return (
      catalogs.get(currentLocale) ||
      catalogs.get(fallbackLocale) ||
      Object.create(null)
    );
  };

  const notify = () => {
    listeners.forEach((listener) => {
      listener(currentLocale);
    });
  };

  const load = async (locale) => {
    assertKnownLocale(locale);

    if (catalogs.has(locale)) {
      return catalogs.get(locale);
    }

    const url = urls[locale];
    if (!url) {
      throw new Error(`[i18n] Missing URL for locale "${locale}".`);
    }
    if (!fetchFn) {
      throw new Error("[i18n] fetch is not available for lazy locale loading.");
    }

    const requestCatalogGeneration = catalogGeneration;
    const response = await fetchFn(url);
    if (!response?.ok) {
      throw new Error(`[i18n] Failed to load locale "${locale}" from ${url}.`);
    }

    const catalog = await response.json();
    if (requestCatalogGeneration !== catalogGeneration) {
      return catalogs.get(locale) || catalog;
    }
    catalogs.set(locale, catalog);
    return catalog;
  };

  // The page follows the active locale: `<html lang>` names it and
  // `<html dir>` gives its reading direction, so right-to-left locales
  // mirror the layout.
  const syncDocument = () => {
    if (!currentLocale || typeof documentElement?.setAttribute !== "function") {
      return;
    }
    documentElement.setAttribute("lang", currentLocale);
    documentElement.setAttribute("dir", getLocaleDirection(currentLocale));
  };

  const activateLocale = (locale) => {
    currentLocale = locale;
    syncDocument();
    notify();
    return getMessages();
  };

  const replaceCatalogs = (nextCatalogs = {}) => {
    if (
      !nextCatalogs ||
      typeof nextCatalogs !== "object" ||
      Array.isArray(nextCatalogs)
    ) {
      throw new Error("[i18n] replaceCatalogs expects an object keyed by locale.");
    }

    const entries = Object.entries(nextCatalogs);
    entries.forEach(([locale, catalog]) => {
      assertKnownLocale(locale);
      if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
        throw new Error(
          `[i18n] Catalog for locale "${locale}" must be an object.`,
        );
      }
    });

    entries.forEach(([locale, catalog]) => {
      catalogs.set(locale, catalog);
    });
    catalogGeneration += 1;
    localeRequestVersion += 1;
    notify();
    return getMessages();
  };

  const set = async (locale) => {
    assertKnownLocale(locale);
    const requestVersion = localeRequestVersion + 1;
    localeRequestVersion = requestVersion;
    const isLatestRequest = () => requestVersion === localeRequestVersion;

    try {
      await load(locale);
    } catch (error) {
      if (!isLatestRequest()) {
        return getMessages();
      }
      if (locale === fallbackLocale) {
        throw error;
      }
      try {
        await load(fallbackLocale);
      } catch (fallbackError) {
        if (!isLatestRequest()) {
          return getMessages();
        }
        throw fallbackError;
      }
      if (!isLatestRequest()) {
        return getMessages();
      }
      return activateLocale(fallbackLocale);
    }

    if (!isLatestRequest()) {
      return getMessages();
    }
    return activateLocale(locale);
  };

  const ready = async () => {
    if (!currentLocale) {
      return getMessages();
    }
    if (catalogs.has(currentLocale)) {
      syncDocument();
      return getMessages();
    }
    return set(currentLocale);
  };

  const current = () => currentLocale;
  const direction = () => getLocaleDirection(currentLocale);
  const available = () => [...availableLocales];
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const localeService = {
    available,
    current,
    direction,
    load,
    ready,
    replaceCatalogs,
    set,
    subscribe,
  };

  return {
    available,
    current,
    direction,
    getMessages,
    load,
    locale: localeService,
    localeService,
    ready,
    replaceCatalogs,
    set,
    subscribe,
  };
};
