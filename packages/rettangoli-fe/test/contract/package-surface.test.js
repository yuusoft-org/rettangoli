/**
 * Pins what consumers can reach: the exports map, the published file list,
 * the jempl pin, and the deep file paths that apps import by relative
 * `node_modules/@rettangoli/fe/...` path, bypassing the exports map (creator
 * and ui tests do). Changing any of this breaks a production app
 * without a compile error, so a change here must be a reviewed test diff.
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

const FE_DIR = path.resolve(import.meta.dirname, "../..");
const pkg = JSON.parse(readFileSync(path.join(FE_DIR, "package.json"), "utf8"));
const importFromFeDir = (relativePath) =>
  import(pathToFileURL(path.join(FE_DIR, relativePath)).href);

describe("package manifest", () => {
  it("keeps the five entry points of the exports map", () => {
    expect(pkg.exports).toEqual({
      ".": "./src/index.js",
      "./cli": "./src/cli/index.js",
      "./contracts": "./src/contracts/index.js",
      "./server": "./src/server/index.js",
      "./testing": "./src/testing/index.js",
    });
    expect(pkg.main).toBe("./src/index.js");
    expect(pkg.type).toBe("module");
  });

  it("publishes only src, README.md and LICENSE", () => {
    expect(pkg.files).toEqual(["src", "README.md", "LICENSE"]);
    expect(existsSync(path.join(FE_DIR, "README.md"))).toBe(true);
    expect(existsSync(path.join(FE_DIR, "LICENSE"))).toBe(true);
  });

  it("pins jempl exactly and keeps the snabbdom and immer ranges", () => {
    expect(pkg.dependencies.jempl).toBe("1.0.1");
    expect(pkg.dependencies.snabbdom).toBe("^3.6.2");
    expect(pkg.dependencies.immer).toBe("^10.1.1");
  });
});

describe("named exports of each entry point", () => {
  it.each([
    [".", ["createComponent", "createI18nRuntime", "defineOrUpdateComponent", "defineOrUpdateComponents"]],
    ["./cli", ["build", "check", "examples", "resolveServeContext", "scaffold", "watch"]],
    [
      "./contracts",
      [
        "FORBIDDEN_VIEW_KEYS",
        "GLOBAL_REF_KEYS",
        "REF_CLASS_KEY_REGEX",
        "REF_ID_KEY_REGEX",
        "REF_ID_REGEX",
        "buildComponentContractIndex",
        "collectBindingNames",
        "createRefMatchers",
        "formatContractErrors",
        "parseNodeBindings",
        "resolveBestRefMatcher",
        "toCamelCase",
        "validateComponentContractIndex",
        "validateElementIdForRefs",
        "validateEventConfig",
        "validateSchemaContract",
      ],
    ],
    [
      "./server",
      [
        "bindStore",
        "loadComponents",
        "renderComponent",
        "renderDocument",
        "renderView",
        "resolveComponentDefinition",
        "serializeVNode",
      ],
    ],
    ["./testing", ["bindStore", "createComponent", "parseTemplate", "parseView", "renderView"]],
  ])("%s exports exactly the current names", async (entry, names) => {
    const mod = await importFromFeDir(pkg.exports[entry]);
    expect(Object.keys(mod).sort()).toEqual(names);
  });

  it("keeps every function export callable", async () => {
    const regexes = new Set(["REF_CLASS_KEY_REGEX", "REF_ID_KEY_REGEX", "REF_ID_REGEX"]);
    const data = new Set(["FORBIDDEN_VIEW_KEYS", "GLOBAL_REF_KEYS"]);
    for (const entry of Object.keys(pkg.exports)) {
      const mod = await importFromFeDir(pkg.exports[entry]);
      for (const [name, value] of Object.entries(mod)) {
        if (regexes.has(name)) expect(value, name).toBeInstanceOf(RegExp);
        else if (data.has(name)) expect(typeof value, name).toBe("object");
        else expect(typeof value, `${entry} ${name}`).toBe("function");
      }
    }
  });
});

describe("consumer deep imports", () => {
  it("src/parser.js exports parseView and createVirtualDom", async () => {
    const mod = await importFromFeDir("src/parser.js");
    expect(Object.keys(mod).sort()).toEqual(["createVirtualDom", "parseView"]);
    expect(typeof mod.parseView).toBe("function");
    expect(typeof mod.createVirtualDom).toBe("function");
  });

  it("src/createComponent.js has a default export and keeps resolveComponentDefinition", async () => {
    const mod = await importFromFeDir("src/createComponent.js");
    expect(typeof mod.default).toBe("function");
    expect(typeof mod.resolveComponentDefinition).toBe("function");
  });

  it("src/index.js is importable by path and matches the root entry", async () => {
    const mod = await importFromFeDir("src/index.js");
    const entry = await importFromFeDir(pkg.exports["."]);
    expect(Object.keys(mod).sort()).toEqual(Object.keys(entry).sort());
    expect(mod.createComponent).toBe((await importFromFeDir("src/createComponent.js")).default);
  });

  it("src/core/runtime/store.js exports bindStore", async () => {
    const mod = await importFromFeDir("src/core/runtime/store.js");
    expect(typeof mod.bindStore).toBe("function");
  });

  it("bindStore(store, props, constants) initializes eagerly and exposes selectors and actions", async () => {
    // Apps' component test helpers and ui specs call it with three arguments
    // and read the state straight away.
    const { bindStore } = await importFromFeDir("src/core/runtime/store.js");
    const createInitialState = (context) => ({
      seen: { props: context.props, constants: context.constants },
      count: 1,
    });
    let calls = 0;
    const bound = bindStore(
      {
        createInitialState: (context) => {
          calls += 1;
          return createInitialState(context);
        },
        selectCount: ({ state }) => state.count,
        selectViewData: ({ state, props, constants }) => ({
          count: state.count,
          label: `${props.label}/${constants.unit}`,
        }),
        increment: ({ state }, payload) => {
          state.count += payload.by ?? 1;
        },
      },
      { label: "L" },
      { unit: "U" },
    );

    expect(calls).toBe(1);
    expect(bound.getState().seen).toEqual({ props: { label: "L" }, constants: { unit: "U" } });
    expect(Object.keys(bound).sort()).toEqual(["getState", "increment", "selectCount", "selectViewData"]);
    expect(bound.selectCount()).toBe(1);
    bound.increment({ by: 2 });
    expect(bound.selectCount()).toBe(3);
    expect(bound.selectViewData()).toEqual({ count: 3, label: "L/U" });
    expect(calls).toBe(1);
  });
});

describe("jempl pin", () => {
  // Creator tests import the nested copy
  // node_modules/@rettangoli/fe/node_modules/jempl/src/{index,parse/index}.js.
  // Resolving from the fe directory finds the same copy a consumer would.
  const jemplEntry = createRequire(path.join(FE_DIR, "package.json")).resolve("jempl");
  const jemplDir = path.dirname(path.dirname(jemplEntry));

  it("resolves to exactly the pinned version", () => {
    const jemplPkg = JSON.parse(readFileSync(path.join(jemplDir, "package.json"), "utf8"));
    expect(jemplPkg.name).toBe("jempl");
    expect(jemplPkg.version).toBe(pkg.dependencies.jempl);
    expect(jemplPkg.version).toBe("1.0.1");
  });

  it("ships the deep entry files that consumer tests import", async () => {
    expect(jemplEntry).toBe(path.join(jemplDir, "src", "index.js"));
    expect(existsSync(path.join(jemplDir, "src", "parse", "index.js"))).toBe(true);

    const index = await import(pathToFileURL(path.join(jemplDir, "src", "index.js")).href);
    expect(Object.keys(index).sort()).toEqual(["parse", "parseAndRender", "render"]);
    const parse = await import(pathToFileURL(path.join(jemplDir, "src", "parse", "index.js")).href);
    expect(typeof parse.default).toBe("function");
  });
});
