import { toCamelCase, toKebabCase } from "../utils/case.js";

const normalizeBindingName = (bindingName = "") => {
  if (bindingName.startsWith(":")) return { sourceType: "prop", name: bindingName.slice(1) };
  if (bindingName.startsWith("?")) return { sourceType: "boolean-attr", name: bindingName.slice(1) };
  if (bindingName.startsWith(".")) return { sourceType: "legacy-prop", name: bindingName.slice(1) };
  if (bindingName.startsWith("@")) return { sourceType: "event", name: bindingName.slice(1) };
  return { sourceType: "attr", name: bindingName };
};

const normalizeSchemaType = (schemaNode) => {
  if (!schemaNode || typeof schemaNode !== "object" || Array.isArray(schemaNode)) {
    return null;
  }
  if (typeof schemaNode.type === "string" && schemaNode.type) {
    return schemaNode.type;
  }
  return null;
};

const getContractPropSchema = ({ contract, propName }) => {
  if (!(contract?.propTypes instanceof Map) || !propName) {
    return null;
  }
  const candidates = [propName, toCamelCase(propName), toKebabCase(propName)];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (contract.propTypes.has(candidate)) {
      return contract.propTypes.get(candidate);
    }
  }
  return null;
};

export const runCompatibilityRules = ({ models = [], registry = new Map() }) => {
  const diagnostics = [];

  models.forEach((model) => {
    const templateNodes = Array.isArray(model?.view?.templateAst?.nodes)
      ? model.view.templateAst.nodes
      : [];
    const nodeByKey = new Map();
    templateNodes.forEach((node) => {
      nodeByKey.set(`${node?.range?.line || 0}::${node?.rawKey || ""}`, node);
    });

    model?.view?.selectorBindings?.forEach((bindingLine) => {
      const tagName = bindingLine?.tagName;
      if (!tagName || !tagName.includes("-")) {
        return;
      }

      const contract = registry.get(tagName);
      if (!contract) {
        return;
      }

      const astNode = nodeByKey.get(`${bindingLine.line || 0}::${bindingLine.rawKey || ""}`);
      const astAttributes = Array.isArray(astNode?.attributes) ? astNode.attributes : [];
      const provided = new Set();

      (bindingLine.bindingNames || []).forEach((bindingName) => {
        const normalized = normalizeBindingName(String(bindingName || "").trim());
        if (!normalized.name || normalized.sourceType === "event") {
          return;
        }
        provided.add(normalized.name);
        provided.add(toCamelCase(normalized.name));
        provided.add(toKebabCase(normalized.name));
      });

      const missingRequired = [...(contract.requiredProps || [])].filter((requiredProp) => (
        !provided.has(requiredProp)
        && !provided.has(toCamelCase(requiredProp))
        && !provided.has(toKebabCase(requiredProp))
      ));
      if (missingRequired.length > 0) {
        diagnostics.push({
          code: "RTGL-CHECK-COMPAT-001",
          severity: "error",
          filePath: bindingLine.filePath || model?.view?.filePath || "unknown",
          line: bindingLine.line,
          message: `${model.componentKey}: missing required prop(s) [${missingRequired.join(", ")}] for '${tagName}'.`,
        });
      }

      if (contract.events instanceof Set && contract.events.size > 0) {
        astAttributes.forEach((attribute) => {
          if (attribute?.sourceType !== "event" || !attribute?.name) {
            return;
          }
          if (contract.events.has(attribute.name)) {
            return;
          }
          diagnostics.push({
            code: "RTGL-CHECK-COMPAT-002",
            severity: "error",
            filePath: bindingLine.filePath || model?.view?.filePath || "unknown",
            line: attribute?.range?.line || bindingLine.line,
            column: attribute?.range?.column,
            endLine: attribute?.range?.endLine,
            endColumn: attribute?.range?.endColumn,
            message: `${model.componentKey}: unsupported event '${attribute.name}' on '${tagName}'.`,
          });
        });
      }

      astAttributes.forEach((attribute) => {
        if (attribute?.sourceType !== "boolean-attr" || !attribute?.name) {
          return;
        }
        const schema = getContractPropSchema({
          contract,
          propName: attribute.name,
        });
        const schemaType = normalizeSchemaType(schema);
        if (!schemaType || schemaType === "boolean") {
          return;
        }
        diagnostics.push({
          code: "RTGL-CHECK-COMPAT-003",
          severity: "error",
          filePath: bindingLine.filePath || model?.view?.filePath || "unknown",
          line: attribute?.range?.line || bindingLine.line,
          column: attribute?.range?.column,
          endLine: attribute?.range?.endLine,
          endColumn: attribute?.range?.endColumn,
          message: `${model.componentKey}: boolean binding '?${attribute.name}' is incompatible with '${tagName}' prop type '${schemaType}'.`,
        });
      });
    });
  });

  return diagnostics;
};
