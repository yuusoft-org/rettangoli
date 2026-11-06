#!/usr/bin/env node

// Listener diagnostics contract: a seeded matrix of ~3000 listener configs is written as views into
// a temp project and checked with analyzeProject (default and style mode). The listener, handler
// and symbol diagnostics must match test/fixtures/listener-matrix.expected.json exactly: code, line,
// message and order. Regenerate the golden with UPDATE_GOLDEN=1 only for an intended change.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { analyzeProject } from "../src/core/analyze.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, "../../..");
const goldenPath = path.resolve(currentDir, "../test/fixtures/listener-matrix.expected.json");

const COMPONENT_COUNT = 100;
const LISTENERS_PER_COMPONENT = 30;
const COLLECTED_CODE = /^RTGL-CHECK-(LISTENER-\d+|HANDLER-001|SYMBOL-00\d)$/;

const ABSENT = Symbol("absent");
const BOOLEAN_OPTIONS = ["preventDefault", "stopPropagation", "stopImmediatePropagation", "targetOnly", "once"];
const BOOLEAN_VALUES = [true, false, "yes", 1, 0, null];
const NUMBER_VALUES = [0, 25, -1, "5", null, Infinity, NaN];
const HANDLER_VALUES = [
  ABSENT, "handleTap", "handleTap", "handleGone", "onTap", "onGone", "", "bad name", 5, null, true,
];
const ACTION_VALUES = [ABSENT, ABSENT, ABSENT, ABSENT, "doIt", "doGone", "", null];
const PAYLOAD_VALUES = [
  { id: "${item.id}" }, {}, "${item}", "{ id: currentId }", "", [1], [], 5, 0, true, false, null,
];
const EVENT_TYPES = ["click", "input", "value-change"];

// mulberry32: tiny seeded PRNG so the matrix is identical on every run.
const createRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const random = createRandom(20251106);
const pick = (values) => values[Math.floor(random() * values.length)];

const createEventConfig = () => {
  const config = {};
  const assign = (key, value) => {
    if (value !== ABSENT) {
      config[key] = value;
    }
  };
  assign("handler", pick(HANDLER_VALUES));
  assign("action", pick(ACTION_VALUES));
  BOOLEAN_OPTIONS.forEach((option) => {
    if (random() < 0.15) assign(option, pick(BOOLEAN_VALUES));
  });
  if (random() < 0.25) assign("debounce", pick(NUMBER_VALUES));
  if (random() < 0.25) assign("throttle", pick(NUMBER_VALUES));
  if (random() < 0.3) assign("payload", pick(PAYLOAD_VALUES));
  if (random() < 0.05) assign("foo", "bar");
  return config;
};

const listeners = new Map();

const createComponentFiles = (name) => {
  const refs = {};
  const children = [];
  for (let index = 0; index < LISTENERS_PER_COMPONENT; index += 1) {
    const refKey = `r${index}`;
    const eventType = pick(EVENT_TYPES);
    refs[refKey] = { eventListeners: { [eventType]: createEventConfig() } };
    children.push({ [`button#${refKey}`]: `b${index}` });
    listeners.set(`${name}/${refKey}`, eventType);
  }
  return {
    "schema.yaml": `componentName: rtgl-listener-${name}\n`,
    "view.yaml": yaml.dump({ refs, template: [{ "rtgl-view#root": children }] }, { lineWidth: -1 }),
    "handlers.js": "export const handleTap = () => {};\nexport const onTap = () => {};\n",
    "store.js": "export const createInitialState = () => ({});\nexport const doIt = ({ state }) => state;\n",
  };
};

// Each collected diagnostic must name a generated listener (`on ref 'rN'`) and becomes
// { listenerKey, line, template }, where the template is the code plus the message with the
// component, ref and event replaced by placeholders.
const collectDiagnostics = (diagnostics) => diagnostics
  .filter((diagnostic) => COLLECTED_CODE.test(diagnostic.code))
  .map((diagnostic) => {
    const component = path.basename(path.dirname(diagnostic.filePath || ""));
    const refKey = diagnostic.message.match(/ on ref '([^']+)'/)?.[1];
    const listenerKey = `${component}/${refKey}`;
    const eventType = listeners.get(listenerKey);
    assert.ok(eventType, `diagnostic for an unknown listener: ${diagnostic.code} ${diagnostic.message}`);
    const message = diagnostic.message
      .replace(`components/${component}: `, "")
      .replace(` on ref '${refKey}'`, " on ref '<ref>'")
      .replace(`event '${eventType}'`, "event '<event>'");
    return { listenerKey, line: diagnostic.line ?? "-", template: `${diagnostic.code.replace("RTGL-CHECK-", "")} ${message}` };
  });

// Golden shape (kept small on purpose): `templates` lists every distinct message once; `default` maps
// each listener with diagnostics to "line:templateIndex ..." in emission order; `styleChanges` holds
// only the listeners whose style-mode list differs from the default one ("" = no diagnostics).
const encode = (defaultDiagnostics, styleDiagnostics) => {
  const templates = [...new Set([...defaultDiagnostics, ...styleDiagnostics].map(({ template }) => template))].sort();
  const byListener = (collected) => {
    const result = {};
    collected.forEach(({ listenerKey, line, template }) => {
      const entry = `${line}:${templates.indexOf(template)}`;
      result[listenerKey] = result[listenerKey] ? `${result[listenerKey]} ${entry}` : entry;
    });
    return result;
  };
  const defaultByListener = byListener(defaultDiagnostics);
  const styleByListener = byListener(styleDiagnostics);
  const styleChanges = {};
  [...listeners.keys()].forEach((listenerKey) => {
    const styleEntry = styleByListener[listenerKey] || "";
    if (styleEntry !== (defaultByListener[listenerKey] || "")) {
      styleChanges[listenerKey] = styleEntry;
    }
  });
  return {
    listenerCount: listeners.size,
    defaultDiagnosticCount: defaultDiagnostics.length,
    styleDiagnosticCount: styleDiagnostics.length,
    templates,
    default: defaultByListener,
    styleChanges,
  };
};

const projectRoot = realpathSync(mkdtempSync(path.join(tmpdir(), "rtgl-listener-matrix-")));
let actual;
try {
  for (let index = 0; index < COMPONENT_COUNT; index += 1) {
    const name = `c${String(index).padStart(3, "0")}`;
    const componentDir = path.join(projectRoot, "src", "components", name);
    mkdirSync(componentDir, { recursive: true });
    Object.entries(createComponentFiles(name)).forEach(([extension, text]) => {
      writeFileSync(path.join(componentDir, `${name}.${extension}`), text, "utf8");
    });
  }

  const analyze = async (includeStyle) => collectDiagnostics((await analyzeProject({
    cwd: projectRoot,
    dirs: ["./src/components"],
    includeYahtml: true,
    includeStyle,
    workspaceRoot,
  })).diagnostics);
  actual = encode(await analyze(false), await analyze(true));
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

if (process.env.UPDATE_GOLDEN === "1") {
  writeFileSync(goldenPath, `${JSON.stringify(actual, null, 1)}\n`, "utf8");
  console.log(`Listener matrix golden written: ${goldenPath}`);
  process.exit(0);
}

const expected = JSON.parse(readFileSync(goldenPath, "utf8"));
assert.deepEqual(actual, expected, "listener diagnostics differ from test/fixtures/listener-matrix.expected.json");

console.log(
  `Listener issues contract pass (${actual.listenerCount} listeners, `
  + `${actual.defaultDiagnosticCount} default / ${actual.styleDiagnosticCount} style diagnostics).`,
);
