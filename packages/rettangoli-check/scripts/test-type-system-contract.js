#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  areTypesCompatible,
  compareTypeSpecificity,
  inferLiteralLatticeType,
  inferSchemaNodePrimitiveType,
  normalizePrimitiveType,
  schemaNodeToLatticeType,
} from "../src/types/lattice.js";

assert.equal(normalizePrimitiveType("integer"), "number");
assert.equal(normalizePrimitiveType("BOOLEAN"), "boolean");
assert.equal(normalizePrimitiveType(""), "unknown");

const objectType = schemaNodeToLatticeType({
  type: "object",
  properties: {
    title: { type: "string" },
    count: { type: "integer" },
  },
});
assert.equal(objectType.kind, "object");
assert.equal(objectType.properties.title.kind, "string");
assert.equal(objectType.properties.count.kind, "number");

const arrayType = schemaNodeToLatticeType({ type: "array", items: { type: "boolean" } });
assert.equal(arrayType.kind, "array");
assert.equal(arrayType.items.kind, "boolean");

const unionType = schemaNodeToLatticeType({ type: ["string", "null"] });
assert.equal(unionType.kind, "union");
assert.equal(unionType.options.length, 2);

const nullableType = schemaNodeToLatticeType({ type: "number", nullable: true });
assert.equal(nullableType.kind, "union");
assert.equal(inferSchemaNodePrimitiveType({ type: "number", nullable: true }), "number");

const enumType = schemaNodeToLatticeType({ enum: [1, 2, 3] });
assert.equal(enumType.kind, "number");

assert.equal(inferSchemaNodePrimitiveType({ type: "integer" }), "number");
assert.equal(inferSchemaNodePrimitiveType({ type: "string" }), "string");
assert.equal(inferSchemaNodePrimitiveType({}), "unknown");

assert.equal(inferLiteralLatticeType("true").kind, "boolean");
assert.equal(inferLiteralLatticeType("42").kind, "number");
assert.equal(inferLiteralLatticeType("'hello'").kind, "string");

assert.equal(areTypesCompatible({ expected: "number", actual: "number" }), true);
assert.equal(areTypesCompatible({ expected: "boolean", actual: "string" }), false);
assert.equal(areTypesCompatible({ expected: "unknown", actual: "string" }), true);
assert.equal(areTypesCompatible({
  expected: schemaNodeToLatticeType({ type: ["string", "number"] }),
  actual: "string",
}), true);
assert.equal(areTypesCompatible({
  expected: schemaNodeToLatticeType({ type: ["string", "number"] }),
  actual: "boolean",
}), false);

assert.ok(compareTypeSpecificity("number", "string") < 0);

console.log("Type system contract pass (lattice normalization + compatibility).\n");
