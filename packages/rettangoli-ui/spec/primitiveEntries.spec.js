// @vitest-environment node
// The script-tag bundles must register every primitive. Each entry is bundled
// in memory and run in a fresh context with a recording `customElements`, so
// the defined tags are the ones the browser would see. Primitive modules only
// need HTMLElement, CSSStyleSheet and CustomEvent when they load.
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { build } from "esbuild";
import { describe, expect, it } from "vitest";

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

const runEntry = async (entry) => {
  const { outputFiles } = await build({
    entryPoints: [path.join(srcDir, entry)],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    logLevel: "silent",
  });
  const tags = [];
  const context = {
    HTMLElement: class {},
    CSSStyleSheet: class {},
    CustomEvent: class {},
    customElements: {
      define: (tag, constructor) => {
        expect(typeof constructor, tag).toBe("function");
        tags.push(tag);
      },
    },
  };
  vm.runInNewContext(outputFiles[0].text, context);
  return { tags: tags.sort(), context };
};

describe("primitive entries", () => {
  it("registerPrimitives defines the 20 primitives, including rtgl-checkbox", async () => {
    const { tags } = await runEntry("registerPrimitives.js");

    expect(tags).toHaveLength(20);
    expect(tags).toContain("rtgl-checkbox");
  });

  it("the layout bundle defines the same primitives and exposes window.rtgl", async () => {
    const layout = await runEntry("entry-iife-layout.js");
    const { tags } = await runEntry("registerPrimitives.js");

    expect(layout.tags).toEqual(tags);
    expect(Object.keys(layout.context.rtgl).sort()).toEqual([
      "setFormMessages",
      "setIcons",
      "setUiMessages",
    ]);
  });
});
