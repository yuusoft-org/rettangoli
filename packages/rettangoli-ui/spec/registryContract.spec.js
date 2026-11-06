// @vitest-environment node
// The source shape that @rettangoli/check reads from an installed ui package
// (packages/rettangoli-check/src/core/registry.js). Check reverse-engineers
// this tree, so a refactor that breaks one of these shapes silently shrinks the
// attribute registry that every consumer's `rtgl check` uses. Change detector:
// update an expectation only together with a matching check change.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const read = (relativePath) => readFileSync(path.join(srcDir, relativePath), "utf8");

const PRIMITIVE_TAGS = [
  "rtgl-button",
  "rtgl-carousel",
  "rtgl-checkbox",
  "rtgl-color-picker",
  "rtgl-dialog",
  "rtgl-grid",
  "rtgl-image",
  "rtgl-input",
  "rtgl-input-date",
  "rtgl-input-datetime",
  "rtgl-input-duration",
  "rtgl-input-number",
  "rtgl-input-time",
  "rtgl-popover",
  "rtgl-slider",
  "rtgl-svg",
  "rtgl-tag",
  "rtgl-text",
  "rtgl-textarea",
  "rtgl-view",
];

// Check finds primitives through top-level `customElements.define("tag", X({}))`
// statements and `import X from "./primitives/..."` lines in these entries.
const ENTRIES = ["registerPrimitives.js", "entry-iife-ui.js", "entry-iife-layout.js"];
const DEFINE = /^customElements\.define\(\s*(["'])([^"']+)\1\s*,\s*(\w+)\(\{\}\)\s*\);?\s*$/gm;
const IMPORT = /^import\s+(\w+)\s+from\s+(["'])(\.[^"']+)\2;?\s*$/gm;

const parseEntry = (entry) => {
  const source = read(entry);
  const imports = new Map(
    [...source.matchAll(IMPORT)].map(([, local, , from]) => [local, from]),
  );
  return [...source.matchAll(DEFINE)].map(([, , tagName, symbol]) => ({
    tagName,
    symbol,
    importPath: imports.get(symbol),
  }));
};

// Top-level keys of `const <name> = { ... }`, scanning quotes, comments and
// nesting. The expected lists below are what check's oxc reading returns; check
// only falls back to a scanner like this one when oxc fails to parse the file.
const topLevelObjectKeys = (source, name) => {
  const marker = `const ${name} = {`;
  const start = source.indexOf(marker);
  if (start === -1) return null;
  const body = source.slice(start + marker.length);
  const keys = [];
  let depth = 0;
  let quote = null;
  let pair = "";
  const flush = () => {
    const key = pair.trim().match(/^["']?([\w-]+)["']?\s*:/);
    if (key) keys.push(key[1]);
    pair = "";
  };
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (!quote && char === "/" && (body[i + 1] === "/" || body[i + 1] === "*")) {
      const isLine = body[i + 1] === "/";
      const end = isLine ? body.indexOf("\n", i) : body.indexOf("*/", i + 2);
      if (end === -1) break;
      i = isLine ? end : end + 1;
      continue;
    }
    if (`"'\``.includes(char)) {
      if (quote === char) quote = null;
      else if (!quote) quote = char;
    } else if (!quote) {
      if (char === "{") depth += 1;
      if (char === "}") {
        if (depth === 0) break;
        depth -= 1;
      }
      if (char === "," && depth === 0) {
        flush();
        continue;
      }
    }
    pair += char;
  }
  flush();
  return keys;
};

describe("entry files", () => {
  it("define the 20 primitive tags as literal top-level statements", () => {
    const defined = ENTRIES.flatMap(parseEntry);
    expect([...new Set(defined.map(({ tagName }) => tagName))].sort()).toEqual(
      PRIMITIVE_TAGS,
    );
    expect(parseEntry("registerPrimitives.js").map(({ tagName }) => tagName).sort()).toEqual(
      PRIMITIVE_TAGS,
    );
  });

  it("keep the full literal define list in entry-iife-layout", () => {
    // @rettangoli/check 0.1.4 and older read primitives only from entry-iife-ui and entry-iife-layout.
    expect(parseEntry("entry-iife-layout.js").map(({ tagName }) => tagName).sort()).toEqual(
      PRIMITIVE_TAGS,
    );
  });

  it("import every defined primitive from ./primitives/", () => {
    for (const entry of ENTRIES) {
      for (const { tagName, importPath } of parseEntry(entry)) {
        expect(importPath, `${entry}: ${tagName}`).toMatch(/^\.\/primitives\/[\w-]+\.js$/);
        expect(() => read(importPath.slice(2)), `${entry}: ${tagName}`).not.toThrow();
      }
    }
  });

  it("keep entry-iife-ui defining its tags through registerPrimitives", () => {
    expect(parseEntry("entry-iife-ui.js")).toEqual([]);
    expect(read("entry-iife-ui.js")).toMatch(/^import "\.\/registerPrimitives\.js";$/m);
  });
});

describe("primitive modules", () => {
  // Check imports each primitive with only these three globals defined, so a
  // top-level `document`, `window` or `customElements` reference would make it
  // drop that tag from the registry.
  beforeAll(() => {
    vi.stubGlobal("HTMLElement", class {});
    vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
    vi.stubGlobal("CustomEvent", class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } });
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const files = readdirSync(path.join(srcDir, "primitives")).filter((file) =>
    file.endsWith(".js"),
  );

  it("covers one file per primitive tag", () => {
    expect(files).toHaveLength(PRIMITIVE_TAGS.length);
  });

  it.each(files)("%s imports with stubs only and exposes static observedAttributes", async (file) => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
    const { default: factory } = await import(
      pathToFileURL(path.join(srcDir, "primitives", file)).href
    );
    expect(typeof factory).toBe("function");
    const PrimitiveClass = factory({});
    expect(typeof PrimitiveClass).toBe("function");
    expect(Array.isArray(PrimitiveClass.observedAttributes)).toBe(true);
    expect(PrimitiveClass.observedAttributes.length).toBeGreaterThan(0);
  });

  it("popover observes content-sbv, which check reads from observedAttributes", async () => {
    const { default: factory } = await import("../src/primitives/popover.js");
    expect(factory({}).observedAttributes).toContain("content-sbv");
  });
});

describe("style sources", () => {
  it("keeps styleMap a top-level object literal in common.js", async () => {
    const keys = topLevelObjectKeys(read("common.js"), "styleMap");
    expect(keys.length).toBeGreaterThan(0);
    const { styleMapKeys } = await import("../src/common.js");
    expect(keys).toEqual(styleMapKeys);
  });

  it("keeps the styles object literal in each src/styles file that has one", () => {
    const keysByFile = {};
    for (const file of readdirSync(path.join(srcDir, "styles")).sort()) {
      const keys = topLevelObjectKeys(read(`styles/${file}`), "styles");
      if (keys) keysByFile[file] = keys;
    }
    expect(keysByFile).toEqual({
      "buttonMarginStyles.js": ["mt", "mr", "mb", "ml", "m", "mh", "mv", "s", "v"],
      "cursorStyles.js": ["cur"],
      "marginStyles.js": ["mt", "mr", "mb", "ml", "m", "mh", "mv"],
      "marginStylesForTarget.js": ["mt", "mr", "mb", "ml", "m", "mh", "mv"],
      "tagSurfaceStyles.js": ["s", "v"],
      "textColorStyles.js": ["c"],
      "textColorStylesForTarget.js": ["c"],
      "textStyles.js": ["ta", "s"],
      "viewStyles.js": [
        "bgc", "pos", "edge", "shadow", "pt", "pr", "pb", "pl", "p", "ph", "pv",
        "g", "gv", "gh", "bw", "bwt", "bwr", "bwb", "bwl", "bc", "br",
      ],
      "viewStylesForTarget.js": [
        "bgc", "pos", "shadow", "bw", "bwt", "bwr", "bwb", "bwl", "bc", "br",
      ],
    });
  });
});

describe("imported host attribute constants", () => {
  // Check follows named imports of module-level template literals and reads
  // their `:host([attr])` selectors, which is how view and grid get `sbv`.
  it("gives view and grid sbv through overlayScrollbarStyles", () => {
    const scrollbarSource = read("common/overlayScrollbar.js");
    expect(scrollbarSource).toMatch(/^export const overlayScrollbarStyles = `/m);
    expect(scrollbarSource).toContain(':host([sbv="always"])');
    for (const file of ["view.js", "grid.js"]) {
      expect(read(`primitives/${file}`)).toMatch(
        /import \{[^}]*\boverlayScrollbarStyles\b[^}]*\} from "\.\.\/common\/overlayScrollbar\.js";/,
      );
    }
  });
});
