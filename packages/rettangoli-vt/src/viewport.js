const VIEWPORT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export const DEFAULT_VIEWPORT = Object.freeze({
  width: 1280,
  height: 720,
});

function valueType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateViewportEntry(entry, path) {
  assert(
    entry !== null && typeof entry === "object" && !Array.isArray(entry),
    `"${path}" must be an object, got ${valueType(entry)}.`,
  );

  assert(
    typeof entry.id === "string" && entry.id.trim().length > 0,
    `"${path}.id" is required and must be a non-empty string.`,
  );
  assert(
    VIEWPORT_ID_PATTERN.test(entry.id),
    `"${path}.id" must contain only letters, numbers, "-" or "_".`,
  );
  assert(
    typeof entry.width === "number" && Number.isInteger(entry.width) && entry.width >= 1,
    `"${path}.width" must be an integer >= 1.`,
  );
  assert(
    typeof entry.height === "number" && Number.isInteger(entry.height) && entry.height >= 1,
    `"${path}.height" must be an integer >= 1.`,
  );

  return {
    id: entry.id,
    width: entry.width,
    height: entry.height,
  };
}

export function normalizeViewportField(rawViewport, path = "viewport") {
  if (rawViewport === undefined || rawViewport === null) {
    return undefined;
  }

  const rawEntries = Array.isArray(rawViewport) ? rawViewport : [rawViewport];
  assert(rawEntries.length > 0, `"${path}" cannot be an empty array.`);

  const entries = rawEntries.map((entry, index) =>
    validateViewportEntry(entry, `${path}[${index}]`),
  );

  const seen = new Map();
  entries.forEach((entry, index) => {
    const canonicalId = entry.id.toLowerCase();
    const existingIndex = seen.get(canonicalId);
    assert(
      existingIndex === undefined,
      `"${path}[${index}].id" duplicates "${path}[${existingIndex}].id" (case-insensitive).`,
    );
    seen.set(canonicalId, index);
  });

  return entries;
}

export function resolveViewports(frontMatterViewport, configViewport) {
  const selected = frontMatterViewport ?? configViewport;
  if (selected === undefined || selected === null) {
    return [
      {
        id: null,
        width: DEFAULT_VIEWPORT.width,
        height: DEFAULT_VIEWPORT.height,
      },
    ];
  }
  return normalizeViewportField(selected, "viewport");
}

export function appendViewportToBaseName(baseName, viewportId) {
  if (!viewportId) {
    return baseName;
  }
  return `${baseName}--${viewportId}`;
}

export function stripViewportSuffix(itemKey) {
  return itemKey.replace(/--[A-Za-z0-9_-]+$/, "");
}
