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
});
