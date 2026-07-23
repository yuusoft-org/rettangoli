import { describe, expect, it, vi } from "vitest";

import { createI18nRuntime } from "../../src/core/runtime/i18n.js";

describe("i18n runtime", () => {
  it("starts from the configured default locale", () => {
    const runtime = createI18nRuntime({
      defaultLocale: "en",
      fallbackLocale: "en",
      locales: ["en", "vi"],
      initialCatalogs: {
        en: {
          common: {
            saveButton: "Save",
          },
        },
      },
    });

    expect(runtime.current()).toBe("en");
    expect(runtime.getMessages().common.saveButton).toBe("Save");
  });

  it("loads, caches, and notifies locale changes", async () => {
    const listener = vi.fn();
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        common: {
          saveButton: "Luu",
        },
      }),
    }));

    const runtime = createI18nRuntime({
      defaultLocale: "en",
      fallbackLocale: "en",
      locales: ["en", "vi"],
      urls: {
        vi: "/i18n/vi.json",
      },
      initialCatalogs: {
        en: {
          common: {
            saveButton: "Save",
          },
        },
      },
      fetchFn,
    });

    runtime.subscribe(listener);

    expect(runtime.current()).toBe("en");
    expect(runtime.getMessages().common.saveButton).toBe("Save");

    await runtime.set("vi");

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(runtime.current()).toBe("vi");
    expect(runtime.getMessages().common.saveButton).toBe("Luu");
    expect(listener).toHaveBeenCalledWith("vi");

    await runtime.set("vi");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("does not activate stale locale loads after a newer locale request", async () => {
    const pendingResponses = new Map();
    const listener = vi.fn();
    const fetchFn = vi.fn((url) =>
      new Promise((resolve) => {
        pendingResponses.set(url, resolve);
      }));

    const runtime = createI18nRuntime({
      defaultLocale: "en",
      fallbackLocale: "en",
      locales: ["en", "vi", "ja"],
      urls: {
        vi: "/i18n/vi.json",
        ja: "/i18n/ja.json",
      },
      initialCatalogs: {
        en: {
          common: {
            saveButton: "Save",
          },
        },
      },
      fetchFn,
    });
    runtime.subscribe(listener);

    const setVietnamese = runtime.set("vi");
    const setJapanese = runtime.set("ja");

    pendingResponses.get("/i18n/ja.json")({
      ok: true,
      json: async () => ({
        common: {
          saveButton: "Hozon",
        },
      }),
    });

    await setJapanese;

    expect(runtime.current()).toBe("ja");
    expect(runtime.getMessages().common.saveButton).toBe("Hozon");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("ja");

    pendingResponses.get("/i18n/vi.json")({
      ok: true,
      json: async () => ({
        common: {
          saveButton: "Luu",
        },
      }),
    });

    await setVietnamese;

    expect(runtime.current()).toBe("ja");
    expect(runtime.getMessages().common.saveButton).toBe("Hozon");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("falls back when a configured locale fails to load", async () => {
    const runtime = createI18nRuntime({
      defaultLocale: "en",
      fallbackLocale: "en",
      locales: ["en", "vi"],
      urls: {
        vi: "/i18n/vi.json",
      },
      initialCatalogs: {
        en: {
          common: {
            saveButton: "Save",
          },
        },
      },
      fetchFn: async () => ({
        ok: false,
      }),
    });

    await runtime.set("vi");

    expect(runtime.current()).toBe("en");
    expect(runtime.getMessages().common.saveButton).toBe("Save");
  });

  it("loads the configured default locale during ready when needed", async () => {
    const runtime = createI18nRuntime({
      defaultLocale: "vi",
      fallbackLocale: "en",
      locales: ["en", "vi"],
      urls: {
        vi: "/i18n/vi.json",
      },
      initialCatalogs: {
        en: {
          common: {
            saveButton: "Save",
          },
        },
      },
      fetchFn: async () => ({
        ok: true,
        json: async () => ({
          common: {
            saveButton: "Luu",
          },
        }),
      }),
    });

    await runtime.ready();

    expect(runtime.current()).toBe("vi");
    expect(runtime.getMessages().common.saveButton).toBe("Luu");
  });

  it("replaces dev catalogs atomically without replacing runtime state", async () => {
    const listener = vi.fn();
    const runtime = createI18nRuntime({
      defaultLocale: "en",
      fallbackLocale: "en",
      locales: ["en", "vi"],
      initialCatalogs: {
        en: { common: { saveButton: "Save" } },
        vi: { common: { saveButton: "Luu" } },
      },
    });
    const runtimeIdentity = runtime;
    const localeServiceIdentity = runtime.locale;
    runtime.subscribe(listener);
    await runtime.set("vi");
    listener.mockClear();

    const messages = runtime.replaceCatalogs({
      en: { common: { saveButton: "Save now" } },
      vi: { common: { saveButton: "Luu ngay" } },
    });

    expect(runtime).toBe(runtimeIdentity);
    expect(runtime.locale).toBe(localeServiceIdentity);
    expect(runtime.current()).toBe("vi");
    expect(messages.common.saveButton).toBe("Luu ngay");
    expect(runtime.getMessages()).toBe(messages);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("vi");
    expect(runtime.locale.replaceCatalogs).toBe(runtime.replaceCatalogs);

    expect(() =>
      runtime.replaceCatalogs({
        en: { common: { saveButton: "Must not commit" } },
        unknown: { common: { saveButton: "Unknown" } },
      }),
    ).toThrow('Unknown locale "unknown"');
    expect(runtime.getMessages().common.saveButton).toBe("Luu ngay");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not let an older lazy request overwrite or activate hot catalogs", async () => {
    let resolveFetch;
    const listener = vi.fn();
    const fetchFn = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const runtime = createI18nRuntime({
      defaultLocale: "en",
      fallbackLocale: "en",
      locales: ["en", "vi"],
      urls: { vi: "/i18n/vi.json" },
      initialCatalogs: {
        en: { common: { saveButton: "Save" } },
      },
      fetchFn,
    });
    runtime.subscribe(listener);

    const pendingLocaleChange = runtime.set("vi");
    runtime.replaceCatalogs({
      en: { common: { saveButton: "Save hot" } },
      vi: { common: { saveButton: "Luu hot" } },
    });
    resolveFetch({
      ok: true,
      json: async () => ({ common: { saveButton: "Stale response" } }),
    });
    await pendingLocaleChange;

    expect(runtime.current()).toBe("en");
    expect(runtime.getMessages().common.saveButton).toBe("Save hot");
    expect(listener).toHaveBeenCalledTimes(1);

    await runtime.set("vi");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(runtime.current()).toBe("vi");
    expect(runtime.getMessages().common.saveButton).toBe("Luu hot");
  });
});
