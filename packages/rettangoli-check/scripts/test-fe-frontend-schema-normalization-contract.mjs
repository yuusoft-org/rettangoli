#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverComponentEntries, groupEntriesByComponent } from "../src/core/discovery.js";
import { buildComponentModel } from "../src/core/model.js";
import { buildProjectSchemaRegistry } from "../src/core/registry.js";
import { normalizeSchemaYaml } from "../src/core/schema.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const normalized = normalizeSchemaYaml({
  componentName: " rtgl-test-card ",
  propsSchema: {
    properties: {
      title: { type: "string" },
      " badProp": { type: "string" },
      "": { type: "string" },
    },
    required: ["title", " badProp", "", "title"],
  },
  events: {
    tap: {},
    " bad-event": {},
  },
  methods: {
    properties: {
      focusInput: { type: "function" },
      " blurInput": { type: "function" },
    },
  },
});

assert.equal(normalized.componentName, "rtgl-test-card", "componentName should be trimmed");
assert.deepEqual(normalized.props.names, ["title"], "props should keep canonical keys only");
assert.deepEqual(normalized.props.requiredNames, ["title"], "required props should keep canonical keys only");
assert.deepEqual(normalized.events.names, ["tap"], "events should keep canonical keys only");
assert.deepEqual(normalized.methods.names, ["focusInput"], "methods should keep canonical keys only");
assert.equal(
  normalized.props.aliasToCanonical.get("title"),
  "title",
  "alias map should include canonical prop aliases",
);

const scenarioRoot = path.resolve(
  currentDir,
  "../test/scenarios/64-project-schema-registry-trims-component-name-whitespace",
);
const discovery = discoverComponentEntries({
  cwd: scenarioRoot,
  dirs: ["./src/components"],
});
const groups = groupEntriesByComponent(discovery.entries);
assert.ok(groups.length >= 1, "expected at least one component group");
const childGroup = groups.find((group) => group.component === "child");
assert.ok(childGroup, "expected child component group in fixture");

const model = buildComponentModel(childGroup);
assert.equal(
  model.schema.normalized.componentName,
  "rtgl-test-child-trim",
  "frontend model should store trimmed canonical componentName",
);

const projectRegistry = buildProjectSchemaRegistry({ models: [model] });
assert.ok(projectRegistry.has("rtgl-test-child-trim"), "registry should use normalized componentName");

console.log("FE frontend schema normalization contract pass (canonical schema shape + normalized registry keys).");
