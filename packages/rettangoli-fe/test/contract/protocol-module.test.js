/**
 * Every protocol name (see cross-bundle-protocol.test.js) is defined once, in
 * src/core/protocol.js. The modules that used to define their own copies
 * re-export it, and no other source file spells a name out.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import * as protocol from "../../src/core/protocol.js";
import { PARENT_UPDATE_TRANSACTION } from "../../src/core/runtime/updateTransaction.js";
import { generateFrontendEntrySource } from "../../src/cli/frontendEntrySource.js";
import { RETTANGOLI_COMPONENT_MARKER } from "../../src/web/componentUpdateHook.js";
import {
  RETTANGOLI_HOT_APPLY,
  RETTANGOLI_HOT_PREPARE,
} from "../../src/web/createWebComponentClass.js";
import {
  HYDRATE_ATTRIBUTE,
  SERVER_PROPS_ATTRIBUTE,
  recordHydration,
} from "../../src/web/hydration.js";

const SRC_DIR = path.resolve(import.meta.dirname, "../../src");
const PROTOCOL_FILE = path.join(SRC_DIR, "core/protocol.js");
const DASHBOARD_DIR = path.resolve(import.meta.dirname, "../../e2e/dashboard");

const listSourceFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return entry.name.endsWith(".js") ? [fullPath] : [];
  });

// Code lines only: doc comments may still name the markers.
const codeLines = (source) =>
  source.split("\n").filter((line) => !/^\s*(\/\/|\/?\*)/.test(line));

describe("src/core/protocol.js", () => {
  it("exports the protocol names with today's values", () => {
    expect({ ...protocol }).toEqual({
      HYDRATE_ATTRIBUTE: "data-rtgl-hydrate",
      SERVER_PROPS_ATTRIBUTE: "data-rtgl-props",
      RENDER_TARGET_ATTRIBUTE: "data-rtgl-render-target",
      HYDRATION_REPORT_KEY: "__rtglHydration",
      RETTANGOLI_COMPONENT_MARKER: Symbol.for("@rettangoli/fe/component"),
      PARENT_UPDATE_TRANSACTION: Symbol.for("@rettangoli/fe/parent-update-transaction"),
      RETTANGOLI_HOT_APPLY: Symbol.for("@rettangoli/fe/hot-apply"),
      RETTANGOLI_HOT_PREPARE: Symbol.for("@rettangoli/fe/hot-prepare"),
      RETTANGOLI_HOT_COMPONENT_REGISTRY: Symbol.for("@rettangoli/fe/hot-component-registry"),
      RETTANGOLI_STORE_HOT_UPDATE: Symbol.for("@rettangoli/fe/store-hot-update"),
      RETTANGOLI_STORE_INITIALIZE: Symbol.for("@rettangoli/fe/store-initialize"),
    });
  });

  it("imports nothing and touches no DOM, so the server, the CLI and the browser can all load it", () => {
    const source = codeLines(readFileSync(PROTOCOL_FILE, "utf8")).join("\n");
    expect(source).not.toMatch(/\bimport\b/);
    expect(source).not.toMatch(/\b(document|window|HTMLElement|customElements|globalThis)\b/);
  });

  it("is what the older modules re-export", () => {
    expect(HYDRATE_ATTRIBUTE).toBe(protocol.HYDRATE_ATTRIBUTE);
    expect(SERVER_PROPS_ATTRIBUTE).toBe(protocol.SERVER_PROPS_ATTRIBUTE);
    expect(PARENT_UPDATE_TRANSACTION).toBe(protocol.PARENT_UPDATE_TRANSACTION);
    expect(RETTANGOLI_COMPONENT_MARKER).toBe(protocol.RETTANGOLI_COMPONENT_MARKER);
    expect(RETTANGOLI_HOT_APPLY).toBe(protocol.RETTANGOLI_HOT_APPLY);
    expect(RETTANGOLI_HOT_PREPARE).toBe(protocol.RETTANGOLI_HOT_PREPARE);
  });

  it("is the only source file that spells out a protocol name", () => {
    const names = [
      /data-rtgl-(hydrate|props|render-target)\b/,
      /__rtglHydration\b/,
      /Symbol\.for\(/,
      /@rettangoli\/fe\/(component|parent-update-transaction|hot-|store-)/,
    ];
    const offenders = [];
    for (const file of listSourceFiles(SRC_DIR)) {
      if (file === PROTOCOL_FILE || file.includes(`${path.sep}vendor${path.sep}`)) continue;
      codeLines(readFileSync(file, "utf8")).forEach((line) => {
        if (names.some((name) => name.test(line))) {
          offenders.push(`${path.relative(SRC_DIR, file)}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe("protocol names in use", () => {
  afterEach(() => {
    delete globalThis[protocol.HYDRATION_REPORT_KEY];
  });

  it("counts hydrated hosts under HYDRATION_REPORT_KEY", () => {
    recordHydration({ elementName: "x-a", report: { replaced: 0, corrected: 0, reasons: [] } });
    recordHydration({ elementName: "x-b", report: { replaced: 1, corrected: 0, reasons: ["text differs"] } });
    expect(globalThis.__rtglHydration).toEqual({
      hydrated: 1,
      mismatched: 1,
      reasons: ["<x-b> text differs"],
    });
  });

  it.each(["build", "serve"])("probes for HYDRATE_ATTRIBUTE in the generated %s entry", (command) => {
    const source = generateFrontendEntrySource({
      cwd: DASHBOARD_DIR,
      dirs: ["fe/components"],
      setup: "fe/setup.js",
      command,
    });
    expect(source).toContain(
      `document.querySelector(${JSON.stringify(`[${protocol.HYDRATE_ATTRIBUTE}]`)}) !== null`,
    );
    expect(source).toContain('document.querySelector("[data-rtgl-hydrate]") !== null');
  });
});
