import { analyzeModuleSource } from "../core/jsScope.js";
import { createLineOffsets, offsetToLineColumn } from "../utils/text.js";

const PURE_GLOBALS = new Set([
  "undefined", "NaN", "Infinity",
  "Object", "Array", "Number", "String", "Boolean", "Symbol", "BigInt", "Math", "JSON", "Date", "Intl", "RegExp",
  "Map", "Set", "WeakMap", "WeakSet", "Promise", "Reflect", "Proxy",
  "Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError", "EvalError", "URIError", "AggregateError",
  "ArrayBuffer", "DataView", "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array",
  "Int32Array", "Uint32Array", "Float32Array", "Float64Array", "BigInt64Array", "BigUint64Array",
  "isNaN", "isFinite", "parseInt", "parseFloat",
  "encodeURIComponent", "decodeURIComponent", "encodeURI", "decodeURI",
  "structuredClone", "URL", "URLSearchParams", "TextEncoder", "TextDecoder", "atob", "btoa",
]);

const TIME_HINT = "Read the time in a handler and pass it to the store action as payload.";
const RANDOM_HINT = "Generate the random value in a handler and pass it to the store action as payload.";

// 'value instanceof File' reads no state: it is a type test against a platform class.
const isInstanceofTarget = ({ node, ancestors }) => {
  const parent = ancestors[ancestors.length - 1];
  return parent?.type === "BinaryExpression" && parent.operator === "instanceof" && parent.right === node;
};

// The impure use a free 'Math' or 'Date' reference is part of, if any.
const describeImpureUse = ({ node, name, ancestors }) => {
  const parent = ancestors[ancestors.length - 1];
  if (!parent) {
    return null;
  }

  if (name === "Date" && parent.type === "NewExpression" && parent.callee === node) {
    return parent.arguments.length === 0 ? { label: "new Date()", hint: TIME_HINT } : null;
  }
  if (name === "Date" && parent.type === "CallExpression" && parent.callee === node) {
    return { label: "Date()", hint: TIME_HINT };
  }

  if (parent.type !== "MemberExpression" || parent.object !== node) {
    return null;
  }
  // 'Math.random?.()' wraps the call in a ChainExpression; the callee is still the member.
  const call = ancestors[ancestors.length - 2];
  if (call?.type !== "CallExpression" || call.callee !== parent) {
    return null;
  }
  const method = parent.computed
    ? (typeof parent.property?.value === "string" ? parent.property.value : undefined)
    : parent.property?.name;
  if (name === "Math" && method === "random") {
    return { label: "Math.random()", hint: RANDOM_HINT };
  }
  if (name === "Date" && method === "now") {
    return { label: "Date.now()", hint: TIME_HINT };
  }
  return null;
};

export const runStorePurityRules = ({ models = [] }) => {
  const diagnostics = [];

  models.forEach((model) => {
    const filePath = model?.store?.filePath;
    const sourceText = model?.store?.sourceText;
    if (!filePath || !sourceText) {
      return;
    }
    const analysis = analyzeModuleSource({ sourceText, filePath });
    if (!analysis) {
      return;
    }

    const lineOffsets = createLineOffsets(sourceText);
    const reported = new Set();
    const report = ({ key, node, message }) => {
      if (reported.has(key)) {
        return;
      }
      reported.add(key);
      const { line, column } = offsetToLineColumn({ lineOffsets, offset: node.start });
      diagnostics.push({
        code: "RTGL-CHECK-STORE-001",
        severity: "error",
        filePath,
        line,
        column,
        message: `${model.componentKey}: ${message}`,
      });
    };

    [...analysis.references]
      .filter((reference) => !reference.binding)
      .sort((left, right) => left.node.start - right.node.start)
      .forEach((reference) => {
        const { name, node } = reference;
        if (!PURE_GLOBALS.has(name)) {
          if (name === "arguments" || isInstanceofTarget(reference)) {
            return;
          }
          report({
            key: `global:${name}`,
            node,
            message: `.store.js uses the global '${name}', but a store must have no side effects. Read the value in a handler (or receive it through deps) and pass it to the store action as payload.`,
          });
          return;
        }

        const impureUse = describeImpureUse(reference);
        if (impureUse) {
          report({
            key: `use:${impureUse.label}`,
            node,
            message: `.store.js calls '${impureUse.label}', which returns a different value on every call, but a store must have no side effects. ${impureUse.hint}`,
          });
        }
      });
  });

  return diagnostics;
};
