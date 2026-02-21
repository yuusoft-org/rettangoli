import { parseSync } from "oxc-parser";

const createLineOffsets = (source = "") => {
  const offsets = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") {
      offsets.push(index + 1);
    }
  }
  return offsets;
};

const offsetToLine = ({ lineOffsets = [], offset = 0 }) => {
  let low = 0;
  let high = lineOffsets.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const start = lineOffsets[mid];
    const next = lineOffsets[mid + 1] ?? Number.POSITIVE_INFINITY;
    if (offset >= start && offset < next) {
      return mid + 1;
    }
    if (offset < start) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return undefined;
};

const getPropertyKeyName = (keyNode) => {
  if (!keyNode || typeof keyNode !== "object") {
    return null;
  }
  if (keyNode.type === "Identifier" && typeof keyNode.name === "string" && keyNode.name) {
    return keyNode.name;
  }
  if (keyNode.type === "StringLiteral" && typeof keyNode.value === "string" && keyNode.value) {
    return keyNode.value;
  }
  if (keyNode.type === "Literal" && typeof keyNode.value === "string" && keyNode.value) {
    return keyNode.value;
  }
  return null;
};

const describeObjectPattern = (pattern = {}) => {
  if (!pattern || pattern.type !== "ObjectPattern" || !Array.isArray(pattern.properties)) {
    return null;
  }

  const keys = new Set();
  let hasRest = false;

  pattern.properties.forEach((property) => {
    if (!property || typeof property !== "object") {
      return;
    }

    if (property.type === "RestElement") {
      hasRest = true;
      return;
    }

    if (property.type !== "Property" || property.computed) {
      return;
    }

    const keyName = getPropertyKeyName(property.key);
    if (keyName) {
      keys.add(keyName);
    }
  });

  return {
    kind: "object",
    objectKeys: [...keys].sort((left, right) => left.localeCompare(right)),
    hasRest,
  };
};

const describeParam = (param = {}) => {
  if (!param || typeof param !== "object") {
    return {
      kind: "unknown",
      name: null,
      objectKeys: [],
      hasRest: false,
    };
  }

  if (param.type === "Identifier") {
    return {
      kind: "identifier",
      name: param.name || null,
      objectKeys: [],
      hasRest: false,
    };
  }

  if (param.type === "AssignmentPattern") {
    const left = describeParam(param.left);
    return {
      ...left,
      kind: left.kind === "unknown" ? "assignment" : left.kind,
    };
  }

  const objectPattern = describeObjectPattern(param);
  if (objectPattern) {
    return {
      kind: "object",
      name: null,
      objectKeys: objectPattern.objectKeys,
      hasRest: objectPattern.hasRest,
    };
  }

  return {
    kind: "pattern",
    name: null,
    objectKeys: [],
    hasRest: false,
  };
};

const toFunctionMeta = ({ name, node, lineOffsets = [] }) => {
  if (!name || !node || typeof node !== "object") {
    return null;
  }

  const params = Array.isArray(node.params) ? node.params : [];
  const firstParam = params.length > 0
    ? describeParam(params[0])
    : {
      kind: "none",
      name: null,
      objectKeys: [],
      hasRest: false,
    };
  const secondParam = params.length > 1
    ? describeParam(params[1])
    : {
      kind: "none",
      name: null,
      objectKeys: [],
      hasRest: false,
    };

  return {
    name,
    async: Boolean(node.async),
    paramCount: params.length,
    firstParamName: firstParam.name,
    secondParamName: secondParam.name,
    firstParam,
    secondParam,
    line: offsetToLine({
      lineOffsets,
      offset: Number(node.start) || 0,
    }),
  };
};

export const parseNamedExportedFunctions = ({
  sourceText = "",
  filePath = "unknown.js",
} = {}) => {
  const functions = new Map();
  let parsed = null;

  try {
    parsed = parseSync(filePath, sourceText, { sourceType: "unambiguous" });
  } catch {
    return functions;
  }

  if (!parsed?.program?.body || !Array.isArray(parsed.program.body)) {
    return functions;
  }
  if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
    return functions;
  }

  const lineOffsets = createLineOffsets(sourceText);

  parsed.program.body.forEach((statement) => {
    if (!statement || statement.type !== "ExportNamedDeclaration") {
      return;
    }

    const declaration = statement.declaration;
    if (!declaration) {
      return;
    }

    if (declaration.type === "FunctionDeclaration" && declaration.id?.name) {
      const meta = toFunctionMeta({
        name: declaration.id.name,
        node: declaration,
        lineOffsets,
      });
      if (meta) {
        functions.set(meta.name, meta);
      }
      return;
    }

    if (declaration.type !== "VariableDeclaration" || !Array.isArray(declaration.declarations)) {
      return;
    }

    declaration.declarations.forEach((declarator) => {
      const exportName = declarator?.id?.type === "Identifier" ? declarator.id.name : null;
      if (!exportName) {
        return;
      }
      const init = declarator.init;
      if (!init || (init.type !== "ArrowFunctionExpression" && init.type !== "FunctionExpression")) {
        return;
      }
      const meta = toFunctionMeta({
        name: exportName,
        node: init,
        lineOffsets,
      });
      if (meta) {
        functions.set(meta.name, meta);
      }
    });
  });

  return functions;
};
