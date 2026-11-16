import { parseJs } from "./jsParse.js";

// Scope analysis of one module on the Oxc (ESTree) AST: which identifiers are references, and which
// binding each one resolves to. A reference with no binding is a free identifier (a global).

const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);
const CLASS_TYPES = new Set(["ClassDeclaration", "ClassExpression"]);
const TS_EXPRESSION_WRAPPERS = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
  "TSInstantiationExpression",
]);
const TS_DECLARATIONS_WITH_ID = new Set(["TSEnumDeclaration", "TSModuleDeclaration", "TSImportEqualsDeclaration"]);
const TYPE_ONLY_KEYS = new Set([
  "typeAnnotation",
  "typeParameters",
  "typeArguments",
  "returnType",
  "superTypeArguments",
  "implements",
]);
const NON_CHILD_KEYS = new Set(["type", "start", "end", "range", "loc", "parent"]);

const isNode = (value) => Boolean(value) && typeof value === "object" && typeof value.type === "string";

const forEachChild = (node, visit) => {
  Object.keys(node).forEach((key) => {
    if (NON_CHILD_KEYS.has(key) || TYPE_ONLY_KEYS.has(key)) {
      return;
    }
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (isNode(item)) visit(item, key);
      });
    } else if (isNode(value)) {
      visit(value, key);
    }
  });
};

const collectPatternIdentifiers = (pattern, result = []) => {
  if (!isNode(pattern)) {
    return result;
  }
  switch (pattern.type) {
    case "Identifier":
      result.push(pattern);
      break;
    case "ObjectPattern":
      pattern.properties.forEach((property) => {
        collectPatternIdentifiers(property.type === "RestElement" ? property.argument : property.value, result);
      });
      break;
    case "ArrayPattern":
      pattern.elements.forEach((element) => collectPatternIdentifiers(element, result));
      break;
    case "AssignmentPattern":
      collectPatternIdentifiers(pattern.left, result);
      break;
    case "RestElement":
      collectPatternIdentifiers(pattern.argument, result);
      break;
    case "TSParameterProperty":
      collectPatternIdentifiers(pattern.parameter, result);
      break;
    default:
      break;
  }
  return result;
};

const unwrapExport = (statement) => {
  if (
    (statement?.type === "ExportNamedDeclaration" || statement?.type === "ExportDefaultDeclaration")
    && isNode(statement.declaration)
  ) {
    return statement.declaration;
  }
  return statement;
};

const createScope = (parent, isModuleScope = false) => ({ parent, isModuleScope, bindings: new Map() });

const declare = (scope, identifier, kind, declaration) => {
  if (!identifier?.name || scope.bindings.has(identifier.name)) {
    return;
  }
  scope.bindings.set(identifier.name, {
    name: identifier.name,
    kind,
    node: identifier,
    declaration,
    isModuleScope: scope.isModuleScope,
  });
};

const resolve = (scope, name) => {
  for (let current = scope; current; current = current.parent) {
    const binding = current.bindings.get(name);
    if (binding) {
      return binding;
    }
  }
  return null;
};

// Lexical declarations (let/const/class/function, and TS declarations that create a value) made
// directly by a statement list.
const declareLexical = (scope, statements = []) => {
  statements.forEach((rawStatement) => {
    const statement = unwrapExport(rawStatement);
    if (!isNode(statement)) {
      return;
    }
    if (statement.type === "VariableDeclaration" && statement.kind !== "var") {
      statement.declarations.forEach((declarator) => {
        collectPatternIdentifiers(declarator.id).forEach((identifier) => {
          declare(scope, identifier, statement.kind, statement);
        });
      });
    } else if (statement.type === "FunctionDeclaration" || statement.type === "TSDeclareFunction") {
      declare(scope, statement.id, "function", statement);
    } else if (statement.type === "ClassDeclaration") {
      declare(scope, statement.id, "class", statement);
    } else if (TS_DECLARATIONS_WITH_ID.has(statement.type) && statement.id?.type === "Identifier") {
      declare(scope, statement.id, "ts", statement);
    }
  });
};

// 'var' declarations hoist to the enclosing function (or module) scope from any nested statement.
const declareHoistedVars = (scope, node) => {
  if (!isNode(node)) {
    return;
  }
  if (node.type === "VariableDeclaration" && node.kind === "var") {
    node.declarations.forEach((declarator) => {
      collectPatternIdentifiers(declarator.id).forEach((identifier) => declare(scope, identifier, "var", node));
    });
    return;
  }
  if (FUNCTION_TYPES.has(node.type) || CLASS_TYPES.has(node.type) || node.type.startsWith("TS")) {
    return;
  }
  forEachChild(node, (child) => declareHoistedVars(scope, child));
};

const declareImports = (scope, statements = []) => {
  statements.forEach((statement) => {
    if (statement?.type !== "ImportDeclaration") {
      return;
    }
    (statement.specifiers || []).forEach((specifier) => declare(scope, specifier.local, "import", statement));
  });
};

/**
 * Walks `program` and returns the module's own bindings plus every identifier reference.
 * Each reference is `{ node, name, binding, ancestors }`: `binding` is null for a free identifier,
 * and `ancestors` is the path from the Program node down to the identifier's parent.
 */
export const analyzeModuleScope = (program) => {
  const moduleScope = createScope(null, true);
  const references = [];
  const ancestors = [];

  const body = Array.isArray(program?.body) ? program.body : [];
  declareImports(moduleScope, body);
  declareLexical(moduleScope, body);
  body.forEach((statement) => declareHoistedVars(moduleScope, statement));
  const topLevelStatements = new Set(body.map(unwrapExport));
  moduleScope.bindings.forEach((binding) => {
    binding.isTopLevelStatement = topLevelStatements.has(binding.declaration);
  });

  const visitChildren = (node, scope) => {
    ancestors.push(node);
    forEachChild(node, (child) => visit(child, scope));
    ancestors.pop();
  };

  const visitChild = (parent, child, scope) => {
    if (!isNode(child)) {
      return;
    }
    ancestors.push(parent);
    visit(child, scope);
    ancestors.pop();
  };

  // Binding positions: only default values and computed keys inside the pattern are expressions.
  const visitBindingPattern = (parent, pattern, scope) => {
    if (!isNode(pattern)) {
      return;
    }
    ancestors.push(parent);
    switch (pattern.type) {
      case "ObjectPattern":
        pattern.properties.forEach((property) => {
          if (property.type === "RestElement") {
            visitBindingPattern(pattern, property.argument, scope);
            return;
          }
          if (property.computed) {
            visitChild(property, property.key, scope);
          }
          visitBindingPattern(property, property.value, scope);
        });
        break;
      case "ArrayPattern":
        pattern.elements.forEach((element) => visitBindingPattern(pattern, element, scope));
        break;
      case "AssignmentPattern":
        visitBindingPattern(pattern, pattern.left, scope);
        visitChild(pattern, pattern.right, scope);
        break;
      case "RestElement":
        visitBindingPattern(pattern, pattern.argument, scope);
        break;
      case "TSParameterProperty":
        visitBindingPattern(pattern, pattern.parameter, scope);
        break;
      default:
        break;
    }
    ancestors.pop();
  };

  const visitFunction = (node, scope) => {
    const functionScope = createScope(scope);
    if (node.type === "FunctionExpression") {
      declare(functionScope, node.id, "function", node);
    }
    if (node.type !== "ArrowFunctionExpression") {
      declare(functionScope, { name: "arguments" }, "arguments", node);
    }
    const params = Array.isArray(node.params) ? node.params : [];
    params.forEach((param) => {
      collectPatternIdentifiers(param).forEach((identifier) => declare(functionScope, identifier, "param", node));
    });
    if (node.body?.type === "BlockStatement") {
      declareLexical(functionScope, node.body.body);
      declareHoistedVars(functionScope, node.body);
    }

    params.forEach((param) => visitBindingPattern(node, param, functionScope));
    if (node.body?.type === "BlockStatement") {
      ancestors.push(node);
      visitChildren(node.body, functionScope);
      ancestors.pop();
    } else {
      visitChild(node, node.body, functionScope);
    }
  };

  const visitClass = (node, scope) => {
    let classScope = scope;
    if (node.type === "ClassExpression" && node.id) {
      classScope = createScope(scope);
      declare(classScope, node.id, "class", node);
    }
    ancestors.push(node);
    (node.decorators || []).forEach((decorator) => visit(decorator, scope));
    if (isNode(node.superClass)) {
      visit(node.superClass, classScope);
    }
    if (isNode(node.body)) {
      visitChildren(node.body, classScope);
    }
    ancestors.pop();
  };

  function visit(node, scope) {
    const { type } = node;

    if (type === "Identifier") {
      references.push({
        node,
        name: node.name,
        binding: resolve(scope, node.name),
        ancestors: [...ancestors],
      });
      return;
    }

    if (FUNCTION_TYPES.has(type)) {
      visitFunction(node, scope);
      return;
    }
    if (CLASS_TYPES.has(type)) {
      visitClass(node, scope);
      return;
    }

    if (type.startsWith("TS")) {
      if (TS_EXPRESSION_WRAPPERS.has(type)) {
        visitChild(node, node.expression, scope);
      }
      return;
    }
    if (type.startsWith("JSX")) {
      return;
    }

    switch (type) {
      case "ImportDeclaration":
      case "ExportAllDeclaration":
      case "MetaProperty":
      case "BreakStatement":
      case "ContinueStatement":
        return;
      case "ExportNamedDeclaration":
        // 'export { a as b }' names bindings; it is not treated as a reference.
        visitChild(node, node.declaration, scope);
        return;
      case "LabeledStatement":
        visitChild(node, node.body, scope);
        return;
      case "MemberExpression":
        visitChild(node, node.object, scope);
        if (node.computed) {
          visitChild(node, node.property, scope);
        }
        return;
      case "Property":
      case "MethodDefinition":
      case "PropertyDefinition":
      case "AccessorProperty":
        if (node.computed) {
          visitChild(node, node.key, scope);
        }
        (node.decorators || []).forEach((decorator) => visitChild(node, decorator, scope));
        visitChild(node, node.value, scope);
        return;
      case "VariableDeclaration":
        node.declarations.forEach((declarator) => {
          ancestors.push(node);
          visitBindingPattern(declarator, declarator.id, scope);
          visitChild(declarator, declarator.init, scope);
          ancestors.pop();
        });
        return;
      case "BlockStatement":
      case "StaticBlock": {
        const blockScope = createScope(scope);
        declareLexical(blockScope, node.body);
        if (type === "StaticBlock") {
          declareHoistedVars(blockScope, { type: "BlockStatement", body: node.body });
        }
        visitChildren(node, blockScope);
        return;
      }
      case "SwitchStatement": {
        visitChild(node, node.discriminant, scope);
        const switchScope = createScope(scope);
        node.cases.forEach((switchCase) => declareLexical(switchScope, switchCase.consequent));
        ancestors.push(node);
        node.cases.forEach((switchCase) => visitChildren(switchCase, switchScope));
        ancestors.pop();
        return;
      }
      case "ForStatement":
      case "ForInStatement":
      case "ForOfStatement": {
        const loopScope = createScope(scope);
        declareLexical(loopScope, [type === "ForStatement" ? node.init : node.left]);
        visitChildren(node, loopScope);
        return;
      }
      case "CatchClause": {
        const catchScope = createScope(scope);
        collectPatternIdentifiers(node.param).forEach((identifier) => declare(catchScope, identifier, "catch", node));
        visitBindingPattern(node, node.param, catchScope);
        visitChild(node, node.body, catchScope);
        return;
      }
      default:
        visitChildren(node, scope);
    }
  }

  ancestors.push(program);
  body.forEach((statement) => visit(statement, moduleScope));
  ancestors.pop();

  return {
    moduleBindings: moduleScope.bindings,
    references,
  };
};

// Scope analysis of a source file, or null when the file does not parse (RTGL-CHECK-PARSE-002
// reports that).
export const analyzeModuleSource = ({ sourceText = "", filePath = "unknown.js" } = {}) => {
  let parsed = null;
  try {
    parsed = parseJs({ filePath, sourceText, sourceType: "unambiguous" });
  } catch {
    return null;
  }
  if (!Array.isArray(parsed?.program?.body)) {
    return null;
  }
  if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
    return null;
  }
  return analyzeModuleScope(parsed.program);
};
