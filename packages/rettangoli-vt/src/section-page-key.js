function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

export function deriveSectionPageKey(sectionLike) {
  return normalizeString(sectionLike?.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
