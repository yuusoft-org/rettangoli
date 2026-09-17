import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parseSync } from "oxc-parser";
import { walkFiles } from "../utils/fs.js";

const walk = (node, visit) => {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
    return;
  }
  visit(node);
  Object.values(node).forEach((child) => walk(child, visit));
};

const literal = (node) => typeof node?.value === "string" ? node.value : undefined;
const nameOf = (node) => node?.name ?? literal(node);

const resolveLocalModule = (filePath, specifier) => {
  if (!specifier?.startsWith(".")) return undefined;
  const base = path.resolve(path.dirname(filePath), specifier);
  return [base, `${base}.js`, `${base}.mjs`, `${base}.ts`, path.join(base, "index.js")]
    .find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
};

// Read declarations instead of importing application modules: primitive modules
// can depend on browser globals, services, and application startup side effects.
export const collectProjectPrimitiveContracts = ({ cwd }) => {
  const sourceDir = path.join(cwd, "src");
  if (!existsSync(sourceDir)) return [];
  const modules = new Map();
  const readModule = (filePath) => {
    if (modules.has(filePath)) return modules.get(filePath);
    let program;
    try {
      const parsed = parseSync(filePath, readFileSync(filePath, "utf8"), { sourceType: "unambiguous" });
      if (parsed.errors?.length) return undefined;
      program = parsed.program;
    } catch {
      return undefined;
    }
    const module = { filePath, program, declarations: new Map(), imports: new Map(), exports: new Map() };
    modules.set(filePath, module);
    const consumeDeclaration = (node) => {
      if (node?.type === "VariableDeclaration") {
        node.declarations.forEach((declaration) => {
          if (declaration.id?.type === "Identifier") module.declarations.set(declaration.id.name, declaration.init);
        });
      } else if (node?.id?.name) {
        module.declarations.set(node.id.name, node);
      }
    };
    program.body.forEach((statement) => {
      if (statement.type === "ImportDeclaration") {
        statement.specifiers.forEach((specifier) => {
          module.imports.set(specifier.local.name, {
            path: resolveLocalModule(filePath, literal(statement.source)),
            name: specifier.type === "ImportDefaultSpecifier" ? "default" : nameOf(specifier.imported),
          });
        });
      } else if (statement.type === "ExportNamedDeclaration") {
        consumeDeclaration(statement.declaration);
        if (statement.declaration?.id?.name) module.exports.set(statement.declaration.id.name, statement.declaration);
        statement.declaration?.declarations?.forEach((declaration) => {
          if (declaration.id?.name) module.exports.set(declaration.id.name, declaration.init);
        });
        statement.specifiers?.forEach((specifier) => {
          if (!statement.source) module.exports.set(nameOf(specifier.exported), specifier.local);
        });
      } else if (statement.type === "ExportDefaultDeclaration") {
        consumeDeclaration(statement.declaration);
        module.exports.set("default", statement.declaration);
      } else {
        consumeDeclaration(statement);
      }
    });
    return module;
  };

  const resolveValue = (module, node, seen = new Set()) => {
    if (!module || !node) return undefined;
    if (node.type !== "Identifier") return { module, node };
    const key = `${module.filePath}:${node.name}`;
    if (seen.has(key)) return undefined;
    seen.add(key);
    const declaration = module.declarations.get(node.name);
    if (declaration) return resolveValue(module, declaration, seen);
    const imported = module.imports.get(node.name);
    if (!imported?.path) return undefined;
    const target = readModule(imported.path);
    return resolveValue(target, target?.exports.get(imported.name), seen);
  };

  const contracts = [];
  const files = walkFiles([sourceDir]).filter((filePath) => /\.(?:js|mjs|ts)$/.test(filePath));
  files.forEach((filePath) => {
    // Most source files do not register primitives, so avoid parsing those.
    if (!/customElements\s*\.\s*define\s*\(/.test(readFileSync(filePath, "utf8"))) return;
    const module = readModule(filePath);
    if (!module) return;
    walk(module.program, (node) => {
      if (node.type !== "CallExpression"
        || node.callee?.type !== "MemberExpression"
        || nameOf(node.callee.object) !== "customElements"
        || nameOf(node.callee.property) !== "define") return;
      const tagName = literal(resolveValue(module, node.arguments[0])?.node);
      const constructor = resolveValue(module, node.arguments[1]);
      if (!tagName?.includes("-") || !["ClassDeclaration", "ClassExpression"].includes(constructor?.node?.type)) return;
      const contract = { tagName, attrs: new Set(), props: new Set(), events: new Set() };
      constructor.node.body.body.forEach((member) => {
        if (member.kind === "set" && !member.static && !member.computed) contract.props.add(nameOf(member.key));
        if (member.static && nameOf(member.key) === "observedAttributes") {
          walk(member.value?.body, (child) => {
            if (child.type !== "ReturnStatement") return;
            const value = resolveValue(constructor.module, child.argument)?.node;
            if (value?.type === "ArrayExpression") value.elements.forEach((entry) => {
              const attr = literal(resolveValue(constructor.module, entry)?.node);
              if (attr) contract.attrs.add(attr);
            });
          });
        }
      });
      walk(constructor.node.body, (child) => {
        if (child.type === "CallExpression"
          && child.callee?.object?.type === "ThisExpression"
          && ["getAttribute", "hasAttribute"].includes(nameOf(child.callee.property))) {
          const attr = literal(resolveValue(constructor.module, child.arguments[0])?.node);
          if (attr) contract.attrs.add(attr);
        }
        if (child.type === "NewExpression" && nameOf(child.callee) === "CustomEvent") {
          const event = literal(resolveValue(constructor.module, child.arguments[0])?.node);
          if (event) contract.events.add(event);
        }
      });
      contracts.push(contract);
    });
  });
  return contracts;
};
