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
} = {}) => {
  const availableLocales = normalizeAvailableLocales(locales);
  const catalogs = new Map(Object.entries(initialCatalogs || {}));
  const listeners = new Set();
  let currentLocale = defaultLocale || fallbackLocale || availableLocales[0] || null;
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

    const response = await fetchFn(url);
    if (!response?.ok) {
      throw new Error(`[i18n] Failed to load locale "${locale}" from ${url}.`);
    }

    const catalog = await response.json();
    catalogs.set(locale, catalog);
    return catalog;
  };

  const activateLocale = (locale) => {
    currentLocale = locale;
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
      return getMessages();
    }
    return set(currentLocale);
  };

  const current = () => currentLocale;
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
    load,
    ready,
    set,
    subscribe,
  };

  return {
    available,
    current,
    getMessages,
    load,
    locale: localeService,
    localeService,
    ready,
    set,
    subscribe,
  };
};
