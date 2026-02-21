#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { dump as dumpYaml } from "js-yaml";
import { analyzeProject } from "../src/core/analyze.js";

const CASES = 180;

const seededRandom = (seed = 20260220) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const pick = (rng, values) => values[Math.floor(rng() * values.length)];
const maybe = (rng, chance = 0.5) => rng() < chance;

const normalizeDiagnostic = (diagnostic = {}, root = "") => ({
  code: String(diagnostic.code || "RTGL-CHECK-UNKNOWN"),
  severity: diagnostic.severity === "warn" ? "warn" : "error",
  message: String(diagnostic.message || ""),
  filePath: typeof diagnostic.filePath === "string"
    ? diagnostic.filePath.replace(root, "")
    : "unknown",
  line: Number.isInteger(diagnostic.line) ? diagnostic.line : undefined,
});

const normalizeResult = (result = {}, root = "") => ({
  ok: result.ok === true,
  summary: result.summary,
  diagnostics: (Array.isArray(result.diagnostics) ? result.diagnostics : [])
    .map((diagnostic) => normalizeDiagnostic(diagnostic, root))
    .sort((left, right) => (
      left.code.localeCompare(right.code)
      || left.severity.localeCompare(right.severity)
      || left.filePath.localeCompare(right.filePath)
      || (left.line || 0) - (right.line || 0)
      || left.message.localeCompare(right.message)
    )),
});

const createCaseFixture = ({ rng, root, caseIndex }) => {
  const componentName = `rtgl-fuzz-contract-${caseIndex}`;
  const componentDir = path.join(root, "src", "components", `cmp${caseIndex}`);
  mkdirSync(componentDir, { recursive: true });

  const methodNames = ["commit", "reset", "focus", "toggle"]
    .filter(() => maybe(rng, 0.65));
  if (methodNames.length === 0) {
    methodNames.push("commit");
  }

  const handlerNames = ["handleTap", "handleChange", "handleSubmit"]
    .filter(() => maybe(rng, 0.65));
  if (handlerNames.length === 0) {
    handlerNames.push("handleTap");
  }

  const schemaMethods = methodNames.reduce((result, name) => {
    result[name] = {
      type: "object",
      properties: {
        payload: { type: "string" },
      },
      required: maybe(rng, 0.4) ? ["payload"] : [],
    };
    return result;
  }, {});

  const schema = {
    componentName,
    propsSchema: {
      type: "object",
      properties: {
        title: { type: pick(rng, ["string", "number"]) },
        count: { type: "number" },
      },
      required: maybe(rng, 0.5) ? ["title"] : [],
    },
    methods: {
      type: "object",
      properties: schemaMethods,
    },
  };

  const exportedMethods = methodNames.filter(() => maybe(rng, 0.8));
  const exportedHandlers = handlerNames.filter(() => maybe(rng, 0.8));

  const methodsJs = exportedMethods.length > 0
    ? exportedMethods.map((name) => `export const ${name} = (payload = {}) => payload;`).join("\n")
    : "export const noop = () => {};";

  const handlersJs = exportedHandlers.length > 0
    ? exportedHandlers.map((name) => `export const ${name} = (event) => event;`).join("\n")
    : "export const handleFallback = () => {};";

  const selectedHandler = pick(rng, handlerNames);
  const templateBinding = maybe(rng, 0.4) ? "${count}" : "${title}";

  const view = {
    template: [
      {
        "rtgl-view p=md": [
          {
            "rtgl-text": templateBinding,
          },
          {
            "rtgl-button @click=handleTap": "Commit",
          },
        ],
      },
    ],
    refs: {
      root: {
        eventListeners: {
          click: {
            handler: selectedHandler,
          },
        },
      },
    },
    styles: {},
  };

  writeFileSync(path.join(componentDir, `cmp${caseIndex}.schema.yaml`), dumpYaml(schema), "utf8");
  writeFileSync(path.join(componentDir, `cmp${caseIndex}.view.yaml`), dumpYaml(view), "utf8");
  writeFileSync(path.join(componentDir, `cmp${caseIndex}.methods.js`), `${methodsJs}\n`, "utf8");
  writeFileSync(path.join(componentDir, `cmp${caseIndex}.handlers.js`), `${handlersJs}\n`, "utf8");
};

const run = async () => {
  const rng = seededRandom();
  const workspaceRoot = process.cwd();
  const failures = [];

  for (let index = 0; index < CASES; index += 1) {
    const root = mkdtempSync(path.join(tmpdir(), "rtgl-fe-contract-fuzz-"));
    try {
      createCaseFixture({ rng, root, caseIndex: index + 1 });

      const resultA = await analyzeProject({
        cwd: root,
        dirs: ["./src/components"],
        includeYahtml: true,
        includeExpression: true,
        workspaceRoot,
      });

      const resultB = await analyzeProject({
        cwd: root,
        dirs: ["./src/components"],
        includeYahtml: true,
        includeExpression: true,
        workspaceRoot,
      });

      const normalizedA = normalizeResult(resultA, root);
      const normalizedB = normalizeResult(resultB, root);
      assert.deepEqual(
        normalizedA,
        normalizedB,
        `non-deterministic diagnostics for generated case ${index + 1}`,
      );
    } catch (error) {
      failures.push({
        caseIndex: index + 1,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  if (failures.length > 0) {
    console.error(`FE contract combination fuzz failures: ${failures.length}/${CASES}`);
    failures.slice(0, 20).forEach((failure) => {
      console.error(`- case ${failure.caseIndex}: ${failure.message}`);
    });
    process.exit(1);
  }

  console.log(`FE contract combination fuzz pass: ${CASES} generated schema/export combinations.`);
};

await run();
