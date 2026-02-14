import { toCamelCase } from "../utils/case.js";
import { parseSync } from "oxc-parser";

const RESERVED_WORDS = new Set([
  "if",
  "else",
  "for",
  "while",
  "switch",
  "case",
  "break",
  "continue",
  "return",
  "throw",
  "try",
  "catch",
  "finally",
  "new",
  "typeof",
  "instanceof",
  "in",
  "void",
  "delete",
  "await",
  "async",
  "true",
  "false",
  "null",
  "undefined",
]);

const BUILTIN_ALLOWED_ROOTS = new Set([
  "_event",
  "_action",
  "event",
  "state",
  "props",
  "refs",
  "constants",
  "window",
  "document",
  "Math",
  "Number",
  "String",
  "Boolean",
  "Object",
  "Array",
  "Date",
  "JSON",
  "console",
]);

const collectObjectExpressionKeys = (node) => {
  if (!node || node.type !== "ObjectExpression" || !Array.isArray(node.properties)) {
    return [];
  }

  const keys = [];
  node.properties.forEach((property) => {
    if (!property || property.type !== "Property") {
      return;
    }
    if (property.computed) {
      return;
    }
    const keyNode = property.key;
    if (keyNode?.type === "Identifier" && keyNode.name) {
      keys.push(keyNode.name);
      return;
    }
    if (
      keyNode?.type === "StringLiteral"
      || keyNode?.type === "Literal"
      || keyNode?.type === "NumericLiteral"
    ) {
      const value = keyNode.value;
      if (typeof value === "string" && value) {
        keys.push(value);
      }
    }
  });
  return keys;
};

const collectReturnObjectKeysFromFunctionNode = (functionNode) => {
  if (!functionNode || typeof functionNode !== "object") {
    return [];
  }

  if (functionNode.body?.type === "ObjectExpression") {
    return collectObjectExpressionKeys(functionNode.body);
  }

  if (functionNode.body?.type !== "BlockStatement" || !Array.isArray(functionNode.body.body)) {
    return [];
  }

  for (let index = 0; index < functionNode.body.body.length; index += 1) {
    const statement = functionNode.body.body[index];
    if (!statement || statement.type !== "ReturnStatement") {
      continue;
    }
    return collectObjectExpressionKeys(statement.argument);
  }

  return [];
};

export const collectSelectViewDataRoots = (sourceText = "", filePath = "unknown.js") => {
  const roots = new Set();
  if (!sourceText) {
    return roots;
  }

  let parsed = null;
  try {
    parsed = parseSync(filePath, sourceText, { sourceType: "unambiguous" });
  } catch {
    return roots;
  }
  if (!parsed?.program?.body || !Array.isArray(parsed.program.body)) {
    return roots;
  }
  if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
    return roots;
  }

  parsed.program.body.forEach((statement) => {
    if (!statement || statement.type !== "ExportNamedDeclaration" || !statement.declaration) {
      return;
    }

    const declaration = statement.declaration;
    if (declaration.type === "FunctionDeclaration" && declaration.id?.name === "selectViewData") {
      collectReturnObjectKeysFromFunctionNode(declaration).forEach((key) => roots.add(key));
      return;
    }

    if (declaration.type === "VariableDeclaration" && Array.isArray(declaration.declarations)) {
      declaration.declarations.forEach((declarator) => {
        if (declarator?.id?.name !== "selectViewData") {
          return;
        }
        const init = declarator.init;
        if (!init || (init.type !== "ArrowFunctionExpression" && init.type !== "FunctionExpression")) {
          return;
        }
        collectReturnObjectKeysFromFunctionNode(init).forEach((key) => roots.add(key));
      });
    }
  });

  return roots;
};

const stripStringLiterals = (source = "") => {
  return source.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/gu, " ");
};

const isNumericLiteral = (value = "") => {
  return /^[-+]?(?:\d+\.?\d*|\d*\.?\d+)$/u.test(value.trim());
};

export const extractExpressionRootIdentifiers = (expression = "") => {
  const source = stripStringLiterals(String(expression));
  const roots = new Set();
  const regex = /(?:^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let match = regex.exec(source);

  while (match) {
    const candidate = match[1];
    if (!candidate || RESERVED_WORDS.has(candidate)) {
      match = regex.exec(source);
      continue;
    }
    roots.add(candidate);
    match = regex.exec(source);
  }

  return [...roots];
};

export const collectKnownExpressionRoots = (model) => {
  const known = new Set(BUILTIN_ALLOWED_ROOTS);
  const schemaProperties = model?.schema?.yaml?.propsSchema?.properties;
  if (schemaProperties && typeof schemaProperties === "object" && !Array.isArray(schemaProperties)) {
    Object.keys(schemaProperties).forEach((propName) => {
      if (!propName) {
        return;
      }
      known.add(propName);
      known.add(toCamelCase(propName));
    });
  }

  const constants = model?.constants?.yaml;
  if (constants && typeof constants === "object" && !Array.isArray(constants)) {
    Object.keys(constants).forEach((constantName) => {
      if (constantName) {
        known.add(constantName);
      }
    });
  }

  [model?.handlers?.exports, model?.methods?.exports, model?.store?.exports].forEach((exportSet) => {
    if (exportSet instanceof Set) {
      exportSet.forEach((name) => {
        if (name) {
          known.add(name);
        }
      });
    }
  });

  collectSelectViewDataRoots(
    model?.store?.sourceText || "",
    model?.store?.filePath || "unknown.store.js",
  ).forEach((key) => known.add(key));

  return known;
};

export const collectTemplateExpressionReferences = (model) => {
  const references = [];
  const nodes = Array.isArray(model?.view?.templateAst?.nodes) ? model.view.templateAst.nodes : [];

  nodes.forEach((node) => {
    const attributes = Array.isArray(node?.attributes) ? node.attributes : [];
    attributes.forEach((attribute) => {
      const sourceType = String(attribute?.sourceType || "");
      if (sourceType === "legacy-prop" || sourceType === "event") {
        return;
      }

      const expressions = Array.isArray(attribute?.expressions) ? attribute.expressions : [];
      expressions.forEach((expression) => {
        const roots = extractExpressionRootIdentifiers(expression);
        references.push({
          expression,
          roots,
          line: attribute?.range?.line || node?.range?.line,
          column: attribute?.range?.column,
          endLine: attribute?.range?.endLine || node?.range?.endLine,
          endColumn: attribute?.range?.endColumn,
        });
      });
    });
  });

  return references;
};

export const isUnknownExpressionRoot = ({
  root = "",
  knownRoots = new Set(),
}) => {
  if (!root) {
    return false;
  }
  if (knownRoots.has(root)) {
    return false;
  }
  if (isNumericLiteral(root)) {
    return false;
  }
  return true;
};
