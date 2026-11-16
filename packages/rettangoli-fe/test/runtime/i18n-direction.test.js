import { describe, expect, it } from "vitest";

import { getLocaleDirection } from "../../src/core/i18n/direction.js";
import { createI18nRuntime } from "../../src/core/runtime/i18n.js";

const createDocumentElement = (attributes = {}) => {
  const state = { ...attributes };
  return {
    attributes: state,
    setAttribute: (name, value) => {
      state[name] = value;
    },
  };
};

const createRuntime = (options = {}) => createI18nRuntime({
  defaultLocale: "en",
  fallbackLocale: "en",
  locales: ["en", "ar", "he"],
  initialCatalogs: {
    en: { common: { save: "Save" } },
    ar: { common: { save: "حفظ" } },
  },
  ...options,
});

describe("getLocaleDirection", () => {
  it("returns rtl for right-to-left languages", () => {
    for (const locale of ["ar", "ar-EG", "he", "he_IL", "fa-IR", "ur", "ps", "yi"]) {
      expect(getLocaleDirection(locale)).toBe("rtl");
    }
  });

  it("returns ltr for left-to-right languages", () => {
    for (const locale of ["en", "en-US", "vi", "ja", "zh-Hant", "de"]) {
      expect(getLocaleDirection(locale)).toBe("ltr");
    }
  });

  it("follows the script when the locale names one", () => {
    expect(getLocaleDirection("az-Arab")).toBe("rtl");
    expect(getLocaleDirection("ar-Latn")).toBe("ltr");
  });

  it("returns ltr for a missing or malformed locale", () => {
    for (const locale of [undefined, null, "", "not a locale!", 42]) {
      expect(getLocaleDirection(locale)).toBe("ltr");
    }
  });
});

describe("i18n runtime document direction", () => {
  it("leaves the document alone until the runtime is ready", () => {
    const documentElement = createDocumentElement({ lang: "fr" });
    createRuntime({ documentElement });

    expect(documentElement.attributes).toEqual({ lang: "fr" });
  });

  it("sets lang and dir for the starting locale on ready", async () => {
    const documentElement = createDocumentElement();
    const runtime = createRuntime({ documentElement });

    await runtime.ready();

    expect(documentElement.attributes).toEqual({ lang: "en", dir: "ltr" });
  });

  it("sets dir to rtl when a right-to-left locale starts", async () => {
    const documentElement = createDocumentElement();
    const runtime = createRuntime({ defaultLocale: "ar", documentElement });

    await runtime.ready();

    expect(documentElement.attributes).toEqual({ lang: "ar", dir: "rtl" });
    expect(runtime.direction()).toBe("rtl");
  });

  it("updates lang and dir before listeners run on a locale change", async () => {
    const documentElement = createDocumentElement();
    const runtime = createRuntime({ documentElement });
    const seen = [];
    runtime.subscribe(() => {
      seen.push({ ...documentElement.attributes });
    });

    await runtime.set("ar");
    expect(documentElement.attributes).toEqual({ lang: "ar", dir: "rtl" });
    expect(runtime.locale.direction()).toBe("rtl");

    await runtime.set("en");
    expect(documentElement.attributes).toEqual({ lang: "en", dir: "ltr" });
    expect(runtime.locale.direction()).toBe("ltr");

    expect(seen).toEqual([
      { lang: "ar", dir: "rtl" },
      { lang: "en", dir: "ltr" },
    ]);
  });

  it("follows the fallback locale when the requested one fails to load", async () => {
    const documentElement = createDocumentElement();
    const runtime = createRuntime({
      documentElement,
      urls: { he: "/i18n/he.json" },
      fetchFn: async () => ({ ok: false }),
    });

    await runtime.set("he");

    expect(runtime.current()).toBe("en");
    expect(documentElement.attributes).toEqual({ lang: "en", dir: "ltr" });
  });

  it("works without a document", async () => {
    const runtime = createRuntime({ documentElement: undefined });

    await runtime.ready();
    await runtime.set("ar");

    expect(runtime.current()).toBe("ar");
    expect(runtime.direction()).toBe("rtl");
  });
});
