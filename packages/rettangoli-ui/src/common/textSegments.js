// Shared text-segment helpers for slots that accept either a plain string or an
// array of segments. A segment is a string (plain text) or an object shaped
// `{ text, href?, newTab?, rel? }`. Pure module: no DOM dependency, safe for
// SSR and store code.

const SAFE_HREF_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const HREF_RESOLUTION_BASE = "https://example.invalid/";

// `new URL` applies the WHATWG URL parser, which trims leading/trailing C0
// controls and spaces, strips tabs/newlines, and lowercases schemes before the
// protocol check. That rejects " javascript:", "JaVaScRiPt:", "java\tscript:",
// and "\u0001javascript:" without any regex on the raw string. Anything that is
// not http/https/mailto (or a relative reference, which resolves to the https
// base) is rejected.
export const isSafeHref = (value) => {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  try {
    return SAFE_HREF_PROTOCOLS.has(new URL(value, HREF_RESOLUTION_BASE).protocol);
  } catch {
    return false;
  }
};

const hasNoopenerToken = (rel) =>
  rel.split(/\s+/).some((token) => token.toLowerCase() === "noopener");

const resolveSegmentRel = (rel, newTab) => {
  if (typeof rel === "string" && rel.trim().length > 0) {
    const trimmedRel = rel.trim();
    return newTab && !hasNoopenerToken(trimmedRel)
      ? `${trimmedRel} noopener`
      : trimmedRel;
  }

  return newTab ? "noopener noreferrer" : "";
};

const normalizeSegment = (entry) => {
  if (typeof entry === "string") {
    return entry.length > 0 ? { text: entry } : null;
  }

  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }

  const { text } = entry;
  if (typeof text !== "string" || text.length === 0) {
    return null;
  }

  if (!isSafeHref(entry.href)) {
    return { text };
  }

  const newTab = entry.newTab === true;
  const segment = { text, href: entry.href };

  if (newTab) {
    segment.target = "_blank";
  }

  const rel = resolveSegmentRel(entry.rel, newTab);
  if (rel.length > 0) {
    segment.rel = rel;
  }

  return segment;
};

// Returns null for non-array values so callers keep their plain-string
// rendering path unchanged. Arrays are returned with only renderable segments:
// dropped entries (non-strings, objects without a string `text`, empty text)
// never survive, and unsafe hrefs degrade to plain text.
export const normalizeTextSegments = (value) => {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.reduce((segments, entry) => {
    const segment = normalizeSegment(entry);
    if (segment !== null) {
      segments.push(segment);
    }
    return segments;
  }, []);
};

// Plain-text projection of a slot value. Strings pass through untouched;
// arrays flatten to the concatenated text of their valid segments (unsafe or
// invalid entries contribute nothing); other values flatten to "".
export const flattenTextSegments = (value) => {
  if (typeof value === "string") {
    return value;
  }

  if (!Array.isArray(value)) {
    return "";
  }

  return value.reduce((text, entry) => {
    if (typeof entry === "string") {
      return text + entry;
    }

    if (entry !== null && typeof entry === "object" && !Array.isArray(entry) && typeof entry.text === "string") {
      return text + entry.text;
    }

    return text;
  }, "");
};

// View-facing variant: null unless the array yields at least one renderable
// segment, so templates can branch with a single truthiness check.
export const renderableTextSegments = (value) => {
  const segments = normalizeTextSegments(value);
  return segments !== null && segments.length > 0 ? segments : null;
};
