import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Consumer-facing contracts of @rettangoli/vt that must survive refactors:
// the package exports, the `./cli` entrypoints, the `src/createSteps.js` deep import
// (routevn-creator-client imports it straight from node_modules), and the
// `chromium.launch` line that route-engine's CI patches with sed.

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readPackageFile = (relativePath) => readFileSync(resolve(packageRoot, relativePath), "utf8");

const SPECIFIER_PATTERN =
  /(?:^|[\s;])(?:import|export)\s[^"'`]*?from\s*["']([^"']+)["']|(?:^|[\s;])import\s*["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)|\brequire\(\s*["']([^"']+)["']\s*\)/g;

function findSpecifiers(source) {
  return [...source.matchAll(SPECIFIER_PATTERN)].map((match) => match.slice(1).find(Boolean));
}

describe("package exports", () => {
  const manifest = JSON.parse(readPackageFile("package.json"));

  it("maps only the root and ./cli entrypoints", () => {
    expect(manifest.main).toBe("./src/index.js");
    expect(manifest.exports).toEqual({
      ".": "./src/index.js",
      "./cli": "./src/cli/index.js",
    });
  });

  it("keeps the root entrypoint an empty module", async () => {
    expect(readPackageFile("src/index.js")).toBe("");
    expect(Object.keys(await import("../src/index.js"))).toEqual([]);
  });

  it("exposes exactly the ./cli entrypoints", async () => {
    const cli = await import("../src/cli/index.js");
    expect(Object.keys(cli).sort()).toEqual([
      "accept",
      "createRettangoliVtWatchPlugin",
      "generate",
      "generateVtWatchSite",
      "generateVtWatchSpec",
      "generateVtWatchSpecs",
      "report",
      "screenshot",
    ]);
    for (const [name, entrypoint] of Object.entries(cli)) {
      expect(typeof entrypoint, name).toBe("function");
      // Every entrypoint takes one optional options object.
      expect(entrypoint.length, name).toBe(0);
    }
  });

  it("requires the watch plugin to be given its client runtime", async () => {
    const { createRettangoliVtWatchPlugin } = await import("../src/cli/index.js");
    expect(() => createRettangoliVtWatchPlugin()).toThrow(TypeError);
    const plugin = createRettangoliVtWatchPlugin({ createWatchClientModuleSource: () => "" });
    expect(Object.keys(plugin).sort()).toEqual([
      "configureServer",
      "enforce",
      "hotUpdate",
      "load",
      "name",
      "resolveId",
    ]);
  });
});

describe("src/createSteps.js deep import", () => {
  it("exports createSteps(page, context?)", async () => {
    // Extra named exports are allowed; consumers only call createSteps.
    const module = await import("../src/createSteps.js");
    expect(typeof module.createSteps).toBe("function");
    expect(module.createSteps.length).toBeLessThanOrEqual(2);
  });

  it("works with an empty context and exposes executeStep", async () => {
    const { createSteps } = await import("../src/createSteps.js");
    const steps = createSteps({}, {});
    expect(typeof steps.executeStep).toBe("function");
    await expect(steps.executeStep({ action: "frobnicate" })).rejects.toThrow(
      'Unknown structured action: "frobnicate".',
    );
  });

  it("finds every kind of import specifier", () => {
    const source = [
      'import a from "pkg-a";',
      'import { b,\n  c } from "./b.js";',
      'export * from "../c.js";',
      'import "side-effect";',
      'const d = await import("pkg-d");',
      'const e = require("node:fs");',
    ].join("\n");
    expect(findSpecifiers(source)).toEqual(["pkg-a", "./b.js", "../c.js", "side-effect", "pkg-d", "node:fs"]);
  });

  it("has no bare specifiers in its import graph", () => {
    // Relative imports are allowed; third-party packages and node: builtins are not,
    // because consumers load this file from node_modules without the package's dependencies.
    const visited = new Set();
    const bare = [];
    const visit = (relativePath) => {
      if (visited.has(relativePath)) {
        return;
      }
      visited.add(relativePath);
      for (const specifier of findSpecifiers(readPackageFile(relativePath))) {
        if (specifier.startsWith("./") || specifier.startsWith("../")) {
          const target = resolve(dirname(resolve(packageRoot, relativePath)), specifier);
          visit(target.slice(packageRoot.length + 1));
        } else {
          bare.push(`${relativePath}: ${specifier}`);
        }
      }
    };
    visit("src/createSteps.js");

    expect(visited.has("src/createSteps.js")).toBe(true);
    expect(bare).toEqual([]);
  });
});

describe("capture-scheduler launch line", () => {
  it("keeps the literal chromium.launch line exactly once at its path", () => {
    // route-engine's CI patches this installed file with sed and requires one match.
    const launchLiteral = "const browser = await chromium.launch({ headless });";
    expect(existsSync(resolve(packageRoot, "src/capture/capture-scheduler.js"))).toBe(true);
    const source = readPackageFile("src/capture/capture-scheduler.js");
    expect(source.split(launchLiteral).length - 1).toBe(1);
  });
});
