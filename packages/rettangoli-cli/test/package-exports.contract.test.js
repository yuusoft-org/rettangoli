// rtgl destructures functions out of @rettangoli/* packages. A package that
// drops or renames one of them does not fail the import: the name silently
// becomes undefined and only breaks when that command runs. The golden tests
// use fakes, so they cannot see this. This test loads the real packages and
// checks that every name the rtgl sources take from them is a function.
//
// The names are read from the sources (cli.js and src/**), not listed here.
// Commands load packages with `load("<specifier>")`, which cli.js maps to
// import(), so both call forms are read the same way.
//
// By default it checks this workspace. To check packed tarballs, install rtgl
// and the @rettangoli/* packages into a temp project and run with
// RTGL_CONTRACT_FROM=<project>: the rtgl sources are then read from
// <project>/node_modules/rtgl. In both modes each package is resolved the way
// rtgl resolves it, from rtgl's own directory, so a copy nested under rtgl
// wins over one installed next to it.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectDirectory = process.env.RTGL_CONTRACT_FROM;
const cliDirectory = projectDirectory
  ? join(projectDirectory, "node_modules", "rtgl")
  : dirname(dirname(fileURLToPath(import.meta.url)));
const resolvePackage = createRequire(join(cliDirectory, "package.json")).resolve;

// The entry points rtgl depends on. If the sources stop mentioning one of
// these, the extraction below probably broke, so fail instead of passing empty.
const EXPECTED_SPECIFIERS = [
  "@rettangoli/check/cli",
  "@rettangoli/fe/cli",
  "@rettangoli/sites/cli",
  "@rettangoli/sites/watch-client",
  "@rettangoli/ui/cli",
  "@rettangoli/vt/cli",
];

const SPECIFIER = String.raw`["'](@rettangoli\/[^"']+)["']`;
const IMPORT_CALL = String.raw`\b(?:import|load)\(\s*${SPECIFIER}\s*,?\s*\)`;

function readSources() {
  const files = [join(cliDirectory, "cli.js")];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.name.endsWith(".js")) files.push(path);
    }
  };
  visit(join(cliDirectory, "src"));

  return files.map((file) =>
    readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, ""),
  );
}

// "a, b: c, d = 1" and "a, b as c" both give ["a", "b", ...]: the exported names.
function exportedNames(pattern) {
  return pattern
    .split(",")
    .map((part) => part.split(/[:=]/)[0].replace(/\s+as\s.*$/, "").trim())
    .filter((name) => /^\w+$/.test(name));
}

// Specifiers of every @rettangoli/* package the sources load.
function mentionedSpecifiers(sources) {
  const pattern = new RegExp(`${IMPORT_CALL}|from\\s*${SPECIFIER}`, "g");
  return new Set(
    sources.flatMap((source) => [...source.matchAll(pattern)].map((m) => m[1] ?? m[2])),
  );
}

// Map<specifier, Set<name>> for the ways rtgl loads packages.
function collectUsedExports(sources) {
  const used = new Map();
  const add = (specifier, names) => {
    const known = used.get(specifier) ?? new Set();
    names.forEach((name) => known.add(name));
    used.set(specifier, known);
  };
  const matches = (source, pattern) => [...source.matchAll(new RegExp(pattern, "g"))];

  for (const source of sources) {
    // ({ a, b: c } = await import("spec"))  and  const { a } = await import("spec")
    for (const [, names, specifier] of matches(
      source,
      String.raw`\{([^{}]*)\}\s*=\s*await\s+${IMPORT_CALL}`,
    )) {
      add(specifier, exportedNames(names));
    }

    // const [{ a }, { b }] = await Promise.all([import("x"), import("y")])
    for (const [, patterns, calls] of matches(
      source,
      String.raw`\[((?:\s*\{[^{}]*\}\s*,?)+)\s*\]\s*=\s*await\s+Promise\.all\(\s*\[([^\]]*)\]`,
    )) {
      const objects = matches(patterns, String.raw`\{([^{}]*)\}`);
      const imports = matches(calls, IMPORT_CALL);
      assert.equal(objects.length, imports.length, "Promise.all imports do not match their patterns");
      objects.forEach(([, names], index) => add(imports[index][1], exportedNames(names)));
    }

    // import { a, b as c } from "spec"
    for (const [, names, specifier] of matches(
      source,
      String.raw`import\s*\{([^{}]*)\}\s*from\s*${SPECIFIER}`,
    )) {
      add(specifier, exportedNames(names));
    }

    // const ns = await import("spec")  or  import * as ns from "spec", then ns.name
    for (const [, binding, specifier] of [
      ...matches(source, String.raw`(?:const|let|var)\s+(\w+)\s*=\s*await\s+${IMPORT_CALL}`),
      ...matches(source, String.raw`import\s*\*\s*as\s+(\w+)\s+from\s*${SPECIFIER}`),
    ]) {
      add(specifier, matches(source, String.raw`\b${binding}\.(\w+)`).map(([, name]) => name));
    }
  }
  return used;
}

test("the sources use every package entry point rtgl is known to depend on", () => {
  const sources = readSources();
  const mentioned = mentionedSpecifiers(sources);
  const used = collectUsedExports(sources);

  for (const specifier of EXPECTED_SPECIFIERS) {
    assert.ok(mentioned.has(specifier), `the rtgl sources no longer load ${specifier}`);
  }
  for (const specifier of mentioned) {
    assert.ok(
      used.get(specifier)?.size > 0,
      `could not read which names are taken from ${specifier}; extend collectUsedExports`,
    );
  }
});

test("every package export that rtgl uses is a function", async () => {
  const problems = [];
  for (const [specifier, names] of collectUsedExports(readSources())) {
    const exports = await import(pathToFileURL(resolvePackage(specifier)).href);
    for (const name of names) {
      if (typeof exports[name] !== "function") {
        problems.push(`${specifier}: ${name} is ${typeof exports[name]}, expected a function`);
      }
    }
  }
  assert.deepStrictEqual(problems, []);
});

test("name extraction understands each way of loading a package", () => {
  const used = collectUsedExports([
    `
    ({ a, b: renamed } = await import("@rettangoli/x/cli",));
    const [{ c }, { d }] = await Promise.all([
      import("@rettangoli/y/cli"),
      import("@rettangoli/z/other"),
    ]);
    import { e, f as g } from "@rettangoli/w";
    const ns = await import("@rettangoli/v/cli");
    ns.h(); ns.i;
    const { j } = await load("@rettangoli/u/cli");
    const [{ k }] = await Promise.all([load("@rettangoli/t/cli")]);
    `,
  ]);

  assert.deepStrictEqual(
    Object.fromEntries([...used].map(([specifier, names]) => [specifier, [...names]])),
    {
      "@rettangoli/x/cli": ["a", "b"],
      "@rettangoli/y/cli": ["c"],
      "@rettangoli/z/other": ["d"],
      "@rettangoli/w": ["e", "f"],
      "@rettangoli/v/cli": ["h", "i"],
      "@rettangoli/u/cli": ["j"],
      "@rettangoli/t/cli": ["k"],
    },
  );
});
