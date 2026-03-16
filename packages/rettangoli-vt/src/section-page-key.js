function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

export function derivePageKey(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function deriveSectionPageKey(sectionLike) {
  return derivePageKey(sectionLike?.title) || derivePageKey(sectionLike?.files);
}

export function deriveAnchorId(value, fallbackValue = "") {
  return derivePageKey(value) || derivePageKey(fallbackValue);
}
