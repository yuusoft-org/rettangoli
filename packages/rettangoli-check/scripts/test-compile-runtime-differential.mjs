#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { load as loadYaml } from "js-yaml";
import { compileProject } from "../src/compiler/compile.js";

const workspaceRoot = path.resolve("packages/rettangoli-check", "../..");
const scenariosRoot = path.resolve("packages/rettangoli-check/test/scenarios");

const fixtures = [
  { scenario: "01-valid-minimal", compileOk: true, runtimeOk: true },
  { scenario: "07-schema-method-missing-export", compileOk: false, runtimeOk: false },
  { scenario: "24-method-default-export-direct", compileOk: false, runtimeOk: false },
  { scenario: "34-cross-file-symbol-multi-export-declarators", compileOk: true, runtimeOk: true },
];

const createFakeNode = (tagName = "div") => ({
  tagName,
  children: [],
  style: { cssText: "" },
  parentNode: null,
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  },
});

const installRuntimeStubs = () => {
  const original = {
    HTMLElement: globalThis.HTMLElement,
    CustomEvent: globalThis.CustomEvent,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    CSSStyleSheet: globalThis.CSSStyleSheet,
    document: globalThis.document,
    window: globalThis.window,
  };

  class FakeHTMLElement {
    constructor() {
      this.__attrs = new Map();
      this.children = [];
      this.style = {};
    }

    setAttribute(name, value) {
      this.__attrs.set(name, String(value));
    }

    getAttribute(name) {
      return this.__attrs.has(name) ? this.__attrs.get(name) : null;
    }

    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }

    attachShadow() {
      const root = createFakeNode("shadow-root");
      root.adoptedStyleSheets = [];
      return root;
    }
  }

  class FakeCustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
      this.bubbles = Boolean(init.bubbles);
    }
  }

  globalThis.HTMLElement = FakeHTMLElement;
  globalThis.CustomEvent = FakeCustomEvent;
  globalThis.requestAnimationFrame = (callback) => callback();
  globalThis.CSSStyleSheet = class {
    replaceSync() {}
  };
  globalThis.window = new EventTarget();
  globalThis.document = Object.assign(new EventTarget(), {
    createElement: (tagName) => createFakeNode(tagName),
  });

  return () => {
    globalThis.HTMLElement = original.HTMLElement;
    globalThis.CustomEvent = original.CustomEvent;
    globalThis.requestAnimationFrame = original.requestAnimationFrame;
    globalThis.CSSStyleSheet = original.CSSStyleSheet;
    globalThis.document = original.document;
    globalThis.window = original.window;
  };
};

const listFiles = (root) => {
  const entries = readdirSync(root);
  return entries.flatMap((entry) => {
    const filePath = path.join(root, entry);
    const info = statSync(filePath);
    if (info.isDirectory()) {
      return listFiles(filePath);
    }
    return [filePath];
  });
};

const loadModuleNamespace = async (filePath) => {
  if (!filePath || !existsSync(filePath)) {
    return {};
  }
  const moduleUrl = pathToFileURL(path.resolve(filePath)).href;
  return import(moduleUrl);
};

const pickFirstFile = (files = [], suffix = "") => {
  return files.find((filePath) => filePath.endsWith(suffix));
};

const loadScenarioRuntimeInput = async ({ scenarioRoot }) => {
  const componentRoot = path.join(scenarioRoot, "src/components");
  const files = listFiles(componentRoot).sort((left, right) => left.localeCompare(right));
  const schemaPath = pickFirstFile(files, ".schema.yaml");
  const viewPath = pickFirstFile(files, ".view.yaml");
  const constantsPath = pickFirstFile(files, ".constants.yaml");
  const handlersPath = pickFirstFile(files, ".handlers.js");
  const methodsPath = pickFirstFile(files, ".methods.js");
  const storePath = pickFirstFile(files, ".store.js");

  const schema = schemaPath ? (loadYaml(readFileSync(schemaPath, "utf8")) ?? {}) : null;
  const view = viewPath ? (loadYaml(readFileSync(viewPath, "utf8")) ?? {}) : null;
  const constants = constantsPath ? (loadYaml(readFileSync(constantsPath, "utf8")) ?? {}) : {};
  const handlers = await loadModuleNamespace(handlersPath);
  const methods = await loadModuleNamespace(methodsPath);
  const storeModule = await loadModuleNamespace(storePath);
  const store = {
    createInitialState: () => ({}),
    selectViewData: () => ({}),
    ...storeModule,
  };

  return {
    handlers,
    methods,
    constants,
    schema,
    view,
    store,
  };
};

const evaluateRuntimeOutcome = async ({ scenarioRoot }) => {
  const runtimeInput = await loadScenarioRuntimeInput({ scenarioRoot });
  const restore = installRuntimeStubs();
  try {
    const { default: createComponent } = await import("../../rettangoli-fe/src/createComponent.js");
    const ComponentClass = createComponent(runtimeInput, {});
    new ComponentClass();
    return {
      ok: true,
      errorMessage: null,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  } finally {
    restore();
  }
};

for (let index = 0; index < fixtures.length; index += 1) {
  const fixture = fixtures[index];
  const scenarioRoot = path.join(scenariosRoot, fixture.scenario);

  const compileResult = await compileProject({
    cwd: scenarioRoot,
    dirs: ["./src/components"],
    workspaceRoot,
    emitArtifact: false,
  });
  const runtimeResult = await evaluateRuntimeOutcome({ scenarioRoot });

  assert.equal(
    compileResult.ok,
    fixture.compileOk,
    `${fixture.scenario}: compileProject.ok mismatch`,
  );
  assert.equal(
    runtimeResult.ok,
    fixture.runtimeOk,
    `${fixture.scenario}: runtime contract outcome mismatch (${runtimeResult.errorMessage || "ok"})`,
  );
  assert.equal(
    compileResult.ok,
    runtimeResult.ok,
    `${fixture.scenario}: compile/runtime differential mismatch (${runtimeResult.errorMessage || "ok"})`,
  );

  console.log(`- ${fixture.scenario}: compile=${compileResult.ok} runtime=${runtimeResult.ok}`);
}

console.log("\nCompile-vs-runtime differential pass (official fixtures).\n");
