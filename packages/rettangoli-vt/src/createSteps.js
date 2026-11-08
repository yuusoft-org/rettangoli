// The step engine. A raw step is either a structured step (`{ action: "click", x: 1, y: 2 }`) or a
// legacy block (`{ "click 10 20": [...nested steps] }`, `{ assert: {...} }`). Structured steps are
// normalized up front, nested steps included, into typed params; legacy block arguments are parsed
// by the action's `legacy(args)` when the block runs. Both then run through the ACTIONS table in
// ./steps/actions.js. Consumers deep-import this file, so its import graph has only relative imports.
import { ACTIONS, requireSelectedElement } from "./steps/actions.js";
import { checkAssertion, runAssertion } from "./steps/assert.js";
import { isPlainObject } from "./steps/shared.js";

const ASSERT_KEYS = ["type", "match", "selector", "timeoutMs", "value", "global", "fn", "args"];

// Legacy blocks look their command up on a plain object, so inherited keys (`toString`,
// `constructor`, `__proto__`) behave exactly as they always have, and run without a target.
const LEGACY_BLOCKS = {};
for (const name of Object.keys(ACTIONS)) {
  LEGACY_BLOCKS[name] = (page, args, context, target) =>
    runAction(page, name, ACTIONS[name].legacy?.(args), context, target);
}

function requireStepAction(stepObject) {
  if (!isPlainObject(stepObject)) {
    throw new Error("Invalid step: expected an object.");
  }
  if (typeof stepObject.action !== "string" || stepObject.action.trim().length === 0) {
    throw new Error("Structured step requires non-empty string `action`.");
  }
  const action = stepObject.action.trim();
  if (action !== "assert" && !Object.prototype.hasOwnProperty.call(ACTIONS, action)) {
    throw new Error(`Unknown structured action: "${action}".`);
  }
  return action;
}

function assertStructuredKeys(stepObject, allowedKeys, actionName) {
  const unknownKeys = Object.keys(stepObject).filter(
    (key) => key !== "action" && !allowedKeys.includes(key),
  );
  if (unknownKeys.length > 0) {
    throw new Error(
      `Structured action "${actionName}" has unknown keys: ${unknownKeys.join(", ")}.`,
    );
  }
}

function normalizeStructuredActionStep(stepObject) {
  const name = requireStepAction(stepObject);
  if (name === "assert") {
    assertStructuredKeys(stepObject, ASSERT_KEYS, name);
    const config = { ...stepObject };
    delete config.action;
    return { kind: "assert", config };
  }
  const action = ACTIONS[name];
  assertStructuredKeys(stepObject, action.keys ?? [], name);
  const params = action.normalize ? action.normalize(stepObject, name) : {};
  const steps = name === "select" ? stepObject.steps.map(normalizeStepValue) : undefined;
  return { kind: "action", name, params, steps };
}

function normalizeLegacyBlockStep(stepObject) {
  const keys = Object.keys(stepObject);
  if (keys.length !== 1) {
    throw new Error(`Step object must have exactly one key, got ${keys.length}.`);
  }
  const [key] = keys;
  if (key === "assert") {
    return { kind: "assert", config: stepObject.assert };
  }

  const nestedStepValues = stepObject[key];
  if (!Array.isArray(nestedStepValues)) {
    throw new Error(`Block step "${key}" must contain an array of nested steps.`);
  }
  const [command, ...args] = key.trim().split(/\s+/).filter(Boolean);
  return { kind: "block", command, args, steps: nestedStepValues.map(normalizeStepValue) };
}

function normalizeStepValue(step) {
  if (!isPlainObject(step)) {
    throw new Error("Invalid step: expected an object.");
  }
  if (Object.prototype.hasOwnProperty.call(step, "action")) {
    return normalizeStructuredActionStep(step);
  }
  return normalizeLegacyBlockStep(step);
}

// What an action checks before touching the page. `target` is the select block's element (or,
// for compileStep, whether there is one).
function checkAction(name, params, target) {
  const action = ACTIONS[name];
  if (action.target === "select") {
    requireSelectedElement(name, target);
  }
  action.check?.(params, target);
}

async function runAction(page, name, params, context, target) {
  checkAction(name, params, target);
  return ACTIONS[name].run(page, params, context, target);
}

function unsupportedBlockCommand(command) {
  return new Error(`Unsupported block command: "${command}".`);
}

function checkNormalizedStep(normalizedStep, inSelect) {
  if (normalizedStep.kind === "assert") {
    checkAssertion(normalizedStep.config, inSelect);
    return;
  }
  if (normalizedStep.kind === "block") {
    const { command, args } = normalizedStep;
    if (!LEGACY_BLOCKS[command]) {
      throw unsupportedBlockCommand(command);
    }
    // Only select gives its nested steps a target. Other legacy blocks are not checked: their own
    // arguments are not compiled, so a nested error could hide the one the runtime throws first.
    if (command !== "select") {
      return;
    }
    ACTIONS.select.legacy(args);
  } else {
    checkAction(normalizedStep.name, normalizedStep.params, inSelect);
  }
  normalizedStep.steps?.forEach((nestedStep) => checkNormalizedStep(nestedStep, true));
}

// Normalizes a raw step and throws the error the runtime would always throw for it, without a
// page: structured steps, select blocks (and their nested steps) and unknown blocks. Arguments of
// other legacy blocks (`{ wait: [] }`) are not checked.
export function compileStep(step, { inSelect = false } = {}) {
  checkNormalizedStep(normalizeStepValue(step), inSelect);
}

export function createSteps(page, context) {
  async function executeNormalizedStep(normalizedStep, selectedElement) {
    if (normalizedStep.kind === "assert") {
      await runAssertion(page, normalizedStep.config, selectedElement, context);
      return;
    }

    let blockSelectedElement;
    if (normalizedStep.kind === "block") {
      const { command, args } = normalizedStep;
      const blockFn = LEGACY_BLOCKS[command];
      if (!blockFn) {
        throw unsupportedBlockCommand(command);
      }
      blockSelectedElement = await blockFn(page, args, context, null);
    } else {
      blockSelectedElement = await runAction(
        page,
        normalizedStep.name,
        normalizedStep.params,
        context,
        selectedElement,
      );
    }
    for (const nestedStep of normalizedStep.steps ?? []) {
      await executeNormalizedStep(nestedStep, blockSelectedElement);
    }
  }

  return {
    async executeStep(step) {
      await executeNormalizedStep(normalizeStepValue(step), null);
    }
  };
}
