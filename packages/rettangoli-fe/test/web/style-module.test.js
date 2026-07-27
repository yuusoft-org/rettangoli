/**
 * Pins the behaviour of the vendored snabbdom style module.
 *
 * The vendored copy exists only so the package imports in Node; its runtime
 * behaviour in a browser must stay byte-equivalent to upstream. If snabbdom is
 * upgraded, these tests are what tell you whether the copy still matches.
 */

import { describe, expect, it } from "vitest";
import { styleModule } from "../../src/web/vendor/snabbdomStyleModule.js";

/** Minimal stand-in for an element's CSSStyleDeclaration. */
const createElementStub = () => ({
  style: {
    custom: {},
    setProperty(name, value) {
      this.custom[name] = value;
    },
    removeProperty(name) {
      delete this.custom[name];
    },
  },
});

const applied = (elm) =>
  Object.fromEntries(
    Object.entries(elm.style).filter(
      ([key, value]) => key !== "custom" && typeof value !== "function",
    ),
  );

const update = (oldStyle, newStyle) => {
  const elm = createElementStub();
  styleModule.update({ data: { style: oldStyle } }, { data: { style: newStyle }, elm });
  return { direct: applied(elm), custom: elm.style.custom };
};

describe("vendored style module", () => {
  it("imports without a DOM — the reason it is vendored at all", () => {
    expect(typeof globalThis.window).toBe("undefined");
    expect(typeof styleModule).toBe("object");
  });

  it("exposes the same hook set as upstream", () => {
    expect(Object.keys(styleModule).sort()).toEqual(
      ["create", "destroy", "pre", "remove", "update"].sort(),
    );
  });

  it("applies new declarations", () => {
    expect(update({}, { color: "red" }).direct).toEqual({ color: "red" });
  });

  it("clears declarations that were removed", () => {
    expect(update({ color: "red" }, {}).direct).toEqual({ color: "" });
  });

  it("routes custom properties through setProperty/removeProperty", () => {
    expect(update({}, { "--x": "1" }).custom).toEqual({ "--x": "1" });
    expect(update({ "--x": "1" }, {}).custom).toEqual({});
  });

  it("updates only changed declarations", () => {
    expect(update({ a: "1", b: "2" }, { b: "3" })).toEqual({
      direct: { a: "", b: "3" },
      custom: {},
    });
  });

  it("does nothing when both sides are absent or identical", () => {
    const elm = createElementStub();
    styleModule.update({ data: {} }, { data: {}, elm });
    expect(applied(elm)).toEqual({});

    const shared = { color: "red" };
    const elm2 = createElementStub();
    styleModule.update({ data: { style: shared } }, { data: { style: shared }, elm: elm2 });
    expect(applied(elm2)).toEqual({});
  });

  it("applies destroy styles", () => {
    const elm = createElementStub();
    styleModule.destroy({ data: { style: { destroy: { opacity: "0" } } }, elm });
    expect(applied(elm)).toEqual({ opacity: "0" });
  });

  it("calls the remove callback immediately when there is no remove style", () => {
    let called = false;
    styleModule.remove({ data: { style: {} }, elm: createElementStub() }, () => {
      called = true;
    });
    expect(called).toBe(true);
  });

  it("defers `delayed` declarations rather than applying them synchronously", () => {
    const elm = createElementStub();
    styleModule.update(
      { data: { style: {} } },
      { data: { style: { delayed: { opacity: "1" } } }, elm },
    );
    // Deferred via the rAF/setTimeout path, so not visible on this tick.
    expect(applied(elm)).toEqual({});
  });

  // The lazy `raf` is the ONLY line this file changes from upstream. Asserting
  // that `delayed` is deferred does not cover it: a raf that drops its callback
  // passes that test, and every other test in the package, silently. These two
  // pin the property that the callback is actually invoked.
  it("eventually applies `delayed` — proves raf invokes its callback", async () => {
    const elm = createElementStub();
    styleModule.update(
      { data: { style: {} } },
      { data: { style: { delayed: { opacity: "0.5" } } }, elm },
    );
    // nextFrame double-nests raf, which falls back to setTimeout in Node.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(applied(elm).opacity).toBe("0.5");
  });

  it("prefers window.requestAnimationFrame and invokes it bound to window", async () => {
    // Run in a child process: `raf` is memoized on first call, so proving the
    // window path needs a fresh module realm with a window already present.
    // Vite cannot resolve a fully dynamic specifier, and vi.resetModules would
    // disturb the rest of this file.
    const { execFileSync } = await import("node:child_process");
    const moduleUrl = new URL(
      "../../src/web/vendor/snabbdomStyleModule.js",
      import.meta.url,
    ).href;

    const script = `
      const calls = [];
      globalThis.window = {
        requestAnimationFrame(cb) {
          calls.push(this === globalThis.window);   // upstream binds to window
          return setTimeout(cb, 0);
        },
      };
      const { styleModule } = await import(${JSON.stringify(moduleUrl)});
      const elm = { style: {} };
      styleModule.update(
        { data: { style: {} } },
        { data: { style: { delayed: { opacity: "1" } } }, elm },
      );
      await new Promise((r) => setTimeout(r, 5));
      console.log(JSON.stringify({
        used: calls.length > 0,
        boundToWindow: calls.length > 0 && calls.every(Boolean),
        opacity: elm.style.opacity,
      }));
    `;

    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
    }).trim();
    const result = JSON.parse(out);

    expect(result.used, "window.requestAnimationFrame should have been used").toBe(true);
    expect(result.boundToWindow, "raf must be invoked with `this` === window").toBe(true);
    expect(result.opacity, "the deferred declaration must actually land").toBe("1");
  });
});

describe("vendored copy vs upstream snabbdom", () => {
  // The file header claims the copy stays faithful, but nothing was checking.
  // Replacing node_modules' style.js with a bare `throw` previously left the
  // whole suite green, proving no test read upstream at all.
  it("differs from upstream only in the lazy raf resolution", async () => {
    const { readFileSync } = await import("node:fs");
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);

    const upstreamPath = require.resolve("snabbdom/build/modules/style.js");
    const upstream = readFileSync(upstreamPath, "utf8");
    const vendored = readFileSync(
      new URL("../../src/web/vendor/snabbdomStyleModule.js", import.meta.url),
      "utf8",
    );

    // Compare the mechanical body: everything from nextFrame onward, with
    // comments and whitespace normalised away. Starting at `nextFrame` rather
    // than `updateStyle` deliberately covers nextFrame/setNextFrame — the lines
    // adjacent to the modified `raf`, and so the likeliest place for a careless
    // re-vendor to drift.
    const body = (source) => {
      const start = source.indexOf("const nextFrame");
      const end = source.indexOf("export const styleModule");
      return source
        .slice(start, end)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    expect(body(vendored), "vendored style module has drifted from upstream").toBe(
      body(upstream),
    );
  });

  it("pins the upstream version the copy was taken from", async () => {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    // Bumping snabbdom without re-checking the copy should fail loudly here.
    expect(require("snabbdom/package.json").version).toBe("3.6.2");
  });
});
