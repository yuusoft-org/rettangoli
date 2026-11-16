import { analyzeModuleSource } from "../core/jsScope.js";
import { createLineOffsets, offsetToLineColumn } from "../utils/text.js";

const FILE_TYPES = ["handlers", "store", "methods"];

const MUTATING_METHODS = new Set([
  "set",
  "add",
  "delete",
  "clear",
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "fill",
  "copyWithin",
]);

const TRANSPARENT_WRAPPERS = new Set([
  "ChainExpression",
  "ParenthesizedExpression",
  "TSNonNullExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
]);

const getStaticPropertyName = (memberNode) => {
  if (!memberNode.computed) {
    return memberNode.property?.type === "Identifier" ? memberNode.property.name : null;
  }
  return typeof memberNode.property?.value === "string" ? memberNode.property.value : null;
};

const OBJECT_MUTATORS = new Set(["assign", "defineProperty", "defineProperties", "setPrototypeOf"]);

// 'Object.assign(cache, ...)' and the like, with the reference as the first argument.
const isObjectMutatorTarget = ({ node, ancestors }) => {
  const call = ancestors[ancestors.length - 1];
  if (call?.type !== "CallExpression" || call.arguments[0] !== node) {
    return false;
  }
  const { callee } = call;
  return (
    callee?.type === "MemberExpression"
    && callee.object?.type === "Identifier"
    && callee.object.name === "Object"
    && OBJECT_MUTATORS.has(getStaticPropertyName(callee))
  );
};

// True when the reference is the root of a member chain that is written to
// ('cache.a.b = 1', 'cache[k]++', 'delete cache[k]'), the root of the receiver of a mutating
// method call ('cache.set(k, v)', 'cache.items.push(v)'), or the target of 'Object.assign'.
const isMutation = ({ node, ancestors }) => {
  if (isObjectMutatorTarget({ node, ancestors })) {
    return true;
  }

  let current = node;
  let index = ancestors.length - 1;
  let memberDepth = 0;
  let lastMember = null;

  for (; index >= 0; index -= 1) {
    const parent = ancestors[index];
    if (parent.type === "MemberExpression" && parent.object === current) {
      memberDepth += 1;
      lastMember = parent;
    } else if (!(TRANSPARENT_WRAPPERS.has(parent.type) && parent.expression === current)) {
      break;
    }
    current = parent;
  }

  const parent = ancestors[index];
  if (!parent || memberDepth === 0) {
    return false;
  }
  if (parent.type === "AssignmentExpression") {
    return parent.left === current;
  }
  if (parent.type === "UpdateExpression") {
    return parent.argument === current;
  }
  if (parent.type === "UnaryExpression") {
    return parent.operator === "delete" && parent.argument === current;
  }
  if (parent.type === "CallExpression") {
    return (
      parent.callee === current
      && MUTATING_METHODS.has(getStaticPropertyName(lastMember))
    );
  }
  return false;
};

const FUNCTION_NODE_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

// A write in a module statement runs once, while the module builds its tables. Only a write
// inside a function can happen while instances are live.
const isInsideFunction = ({ ancestors }) => {
  return ancestors.some((ancestor) => FUNCTION_NODE_TYPES.has(ancestor.type));
};

// A WeakMap or WeakSet is keyed by objects, which is how a module keeps data per instance
// (keyed by the instance's store or element) without sharing it between instances.
const isWeakCollection = (binding) => {
  const declarator = binding.declaration?.declarations?.find(({ id }) => id === binding.node);
  const init = declarator?.init;
  return (
    init?.type === "NewExpression"
    && init.callee?.type === "Identifier"
    && (init.callee.name === "WeakMap" || init.callee.name === "WeakSet")
  );
};

const MAX_ALIAS_HOPS = 5;

// The binding a reference reaches through plain aliases ('const local = cache; local.set(...)').
const resolveAliasedBinding = ({ binding, referenceByNode }) => {
  let current = binding;
  for (let hop = 0; current && hop < MAX_ALIAS_HOPS; hop += 1) {
    const declarator = current.declaration?.declarations?.find(({ id }) => id === current.node);
    if (current.kind !== "const" || declarator?.init?.type !== "Identifier") {
      return current;
    }
    const target = referenceByNode.get(declarator.init)?.binding;
    if (!target) {
      return current;
    }
    current = target;
  }
  return current;
};

const FIX_HINT = "Keep per-instance values in the component's store state and change them through store actions; "
  + "pass long-lived collaborators in through deps from the setup file.";

export const runModuleStateRules = ({ models = [] }) => {
  const diagnostics = [];

  models.forEach((model) => {
    FILE_TYPES.forEach((fileType) => {
      const filePath = model?.[fileType]?.filePath;
      const sourceText = model?.[fileType]?.sourceText;
      if (!filePath || !sourceText) {
        return;
      }
      const analysis = analyzeModuleSource({ sourceText, filePath });
      if (!analysis) {
        return;
      }

      const mutatedConstants = new Set();
      const referenceByNode = new Map(analysis.references.map((reference) => [reference.node, reference]));
      analysis.references.forEach((reference) => {
        if (!reference.binding || !isInsideFunction(reference) || !isMutation(reference)) {
          return;
        }
        const binding = resolveAliasedBinding({ binding: reference.binding, referenceByNode });
        if (
          binding?.isModuleScope
          && binding.kind === "const"
          && !mutatedConstants.has(binding)
          && !isWeakCollection(binding)
        ) {
          mutatedConstants.add(binding);
        }
      });

      const lineOffsets = createLineOffsets(sourceText);
      const fileKind = `.${fileType}.js`;
      analysis.moduleBindings.forEach((binding) => {
        // Only declarations that are module statements: a 'var' hoisted out of a nested block is
        // left alone.
        if (!binding.isTopLevelStatement) {
          return;
        }
        const isReassignable = binding.kind === "let" || binding.kind === "var";
        if (!isReassignable && !mutatedConstants.has(binding)) {
          return;
        }

        const { line, column } = offsetToLineColumn({ lineOffsets, offset: binding.node.start });
        const subject = isReassignable
          ? `module-scope '${binding.kind} ${binding.name}' in ${fileKind} is`
          : `module-scope '${binding.name}' is mutated in ${fileKind} and is`;
        diagnostics.push({
          code: "RTGL-CHECK-MODULE-001",
          severity: "error",
          filePath,
          line,
          column,
          message: `${model.componentKey}: ${subject} shared by every instance of the component. ${FIX_HINT}`,
        });
      });
    });
  });

  return diagnostics;
};
