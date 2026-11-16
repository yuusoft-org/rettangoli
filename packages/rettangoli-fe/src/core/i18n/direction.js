// Languages written right to left, for runtimes without `Intl.Locale` text
// info. Matched against the language subtag of a locale.
const RTL_LANGUAGES = new Set([
  "ar", "arc", "ckb", "dv", "fa", "he", "iw", "ks", "nqo", "ps", "sd", "syr",
  "ug", "ur", "yi",
]);

// Scripts written right to left, for a locale that names its script, such as
// `az-Arab`.
const RTL_SCRIPTS = new Set([
  "adlm", "arab", "hebr", "nkoo", "rohg", "syrc", "thaa",
]);

/**
 * Reading direction of a locale: `"rtl"` or `"ltr"`. An unknown or malformed
 * locale is `"ltr"`.
 */
export const getLocaleDirection = (locale) => {
  if (typeof locale !== "string" || locale === "") {
    return "ltr";
  }

  try {
    const parsed = new Intl.Locale(locale);
    const textInfo = typeof parsed.getTextInfo === "function"
      ? parsed.getTextInfo()
      : parsed.textInfo;
    if (textInfo?.direction === "rtl" || textInfo?.direction === "ltr") {
      return textInfo.direction;
    }
    if (parsed.script) {
      return RTL_SCRIPTS.has(parsed.script.toLowerCase()) ? "rtl" : "ltr";
    }
    return RTL_LANGUAGES.has(parsed.language.toLowerCase()) ? "rtl" : "ltr";
  } catch {
    const [language, script] = locale.toLowerCase().split(/[-_]/);
    if (script && script.length === 4) {
      return RTL_SCRIPTS.has(script) ? "rtl" : "ltr";
    }
    return RTL_LANGUAGES.has(language) ? "rtl" : "ltr";
  }
};
