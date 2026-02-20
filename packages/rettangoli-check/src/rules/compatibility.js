import { toCamelCase, toKebabCase } from "../utils/case.js";
import { resolveExpressionPathType } from "../core/scopeGraph.js";
import { parseNamedExportedFunctions } from "../core/exportedFunctions.js";
import {
  areTypesCompatible,
  inferLiteralLatticeType,
  inferSchemaNodePrimitiveType,
  schemaNodeToLatticeType,
} from "../types/lattice.js";

const normalizeBindingName = (bindingName = "") => {
  if (bindingName.startsWith(":")) return { sourceType: "prop", name: bindingName.slice(1) };
  if (bindingName.startsWith("?")) return { sourceType: "boolean-attr", name: bindingName.slice(1) };
  if (bindingName.startsWith(".")) return { sourceType: "legacy-prop", name: bindingName.slice(1) };
  if (bindingName.startsWith("@")) return { sourceType: "event", name: bindingName.slice(1) };
  return { sourceType: "attr", name: bindingName };
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

const hasPropDefaultValue = ({ contract, propName }) => {
  const schema = getContractPropSchema({ contract, propName });
  return Boolean(
    schema
    && typeof schema === "object"
    && !Array.isArray(schema)
    && Object.prototype.hasOwnProperty.call(schema, "default")
  );
};

const getContractEventSchema = ({ contract, eventName }) => {
  if (!(contract?.eventTypes instanceof Map) || !eventName) {
    return null;
  }
  return contract.eventTypes.get(eventName) || null;
};

const toSchemaRequiredKeys = (schemaNode) => {
  if (!schemaNode || typeof schemaNode !== "object" || Array.isArray(schemaNode)) {
    return [];
  }
  if (!Array.isArray(schemaNode.required)) {
    return [];
  }
  return [...new Set(
    schemaNode.required
      .filter((key) => typeof key === "string" && key.trim() === key && key.length > 0),
  )].sort((left, right) => left.localeCompare(right));
};

const isValidSymbolName = (value = "") => /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(value);

const isValidHandlerName = (value = "") => (
  isValidSymbolName(value)
  && value.startsWith("handle")
);

const latticeTypeToText = (value) => {
  if (typeof value === "string") {
    return value;
  }
  if (!value || typeof value !== "object") {
    return "unknown";
  }
  if (value.kind === "union" && Array.isArray(value.options)) {
    const labels = value.options.map((option) => latticeTypeToText(option));
    return [...new Set(labels)].join(" | ");
  }
  return String(value.kind || "unknown");
};

const inferAttributeExpressionType = ({ model, attribute }) => {
  if (!attribute || typeof attribute !== "object") {
    return "unknown";
  }

  const firstExpression = Array.isArray(attribute.expressions) ? attribute.expressions[0] : null;
  if (typeof firstExpression === "string" && firstExpression.trim()) {
    const pathType = resolveExpressionPathType({
      model,
      expression: firstExpression,
      localSchemaTypes: new Map(),
    });
    if (pathType?.resolved) {
      return inferSchemaNodePrimitiveType(pathType.resolved);
    }
    return "unknown";
  }

  return inferLiteralLatticeType(attribute.valueText).kind;
};

export const runCompatibilityRules = ({ models = [], registry = new Map() }) => {
  const diagnostics = [];

  models.forEach((model) => {
    const exportedHandlerFunctions = parseNamedExportedFunctions({
      sourceText: model?.handlers?.sourceText || "",
      filePath: model?.handlers?.filePath || model?.files?.handlers || "unknown.handlers.js",
    });
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
        && !hasPropDefaultValue({ contract, propName: requiredProp })
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
        if (attribute?.sourceType === "event" && attribute?.name) {
          const rawHandlerSymbol = String(attribute.valueText || "").trim();
          if (!rawHandlerSymbol) {
            return;
          }

          if (!isValidHandlerName(rawHandlerSymbol)) {
            diagnostics.push({
              code: "RTGL-CHECK-HANDLER-003",
              severity: "error",
              filePath: bindingLine.filePath || model?.view?.filePath || "unknown",
              line: attribute?.range?.line || bindingLine.line,
              column: attribute?.range?.column,
              endLine: attribute?.range?.endLine,
              endColumn: attribute?.range?.endColumn,
              message: `${model.componentKey}: invalid handler '${rawHandlerSymbol}' for event '${attribute.name}' on '${tagName}'. Handler names must start with 'handle'.`,
            });
            return;
          }

          if (!model?.handlers?.exports?.has(rawHandlerSymbol)) {
            diagnostics.push({
              code: "RTGL-CHECK-COMPAT-005",
              severity: "error",
              filePath: bindingLine.filePath || model?.view?.filePath || "unknown",
              line: attribute?.range?.line || bindingLine.line,
              column: attribute?.range?.column,
              endLine: attribute?.range?.endLine,
              endColumn: attribute?.range?.endColumn,
              message: `${model.componentKey}: handler '${rawHandlerSymbol}' for event '${attribute.name}' on '${tagName}' is missing in .handlers.js exports.`,
            });
            return;
          }

          const eventSchema = getContractEventSchema({
            contract,
            eventName: attribute.name,
          });
          const requiredPayloadKeys = toSchemaRequiredKeys(eventSchema);
          if (requiredPayloadKeys.length === 0) {
            return;
          }

          const handlerMeta = exportedHandlerFunctions.get(rawHandlerSymbol);
          if (!handlerMeta) {
            return;
          }
          if (handlerMeta.paramCount < 2) {
            diagnostics.push({
              code: "RTGL-CHECK-COMPAT-006",
              severity: "error",
              filePath: bindingLine.filePath || model?.view?.filePath || "unknown",
              line: attribute?.range?.line || bindingLine.line,
              column: attribute?.range?.column,
              endLine: attribute?.range?.endLine,
              endColumn: attribute?.range?.endColumn,
              message: `${model.componentKey}: handler '${rawHandlerSymbol}' for event '${attribute.name}' on '${tagName}' must accept a payload parameter for required payload keys [${requiredPayloadKeys.join(", ")}].`,
            });
            return;
          }

          if (handlerMeta.secondParam?.kind !== "object") {
            return;
          }
          if (handlerMeta.secondParam?.hasRest) {
            return;
          }

          const payloadKeys = new Set(handlerMeta.secondParam.objectKeys || []);
          const missingPayloadKeys = requiredPayloadKeys.filter((key) => !payloadKeys.has(key));
          if (missingPayloadKeys.length === 0) {
            return;
          }

          diagnostics.push({
            code: "RTGL-CHECK-COMPAT-006",
            severity: "error",
            filePath: bindingLine.filePath || model?.view?.filePath || "unknown",
            line: attribute?.range?.line || bindingLine.line,
            column: attribute?.range?.column,
            endLine: attribute?.range?.endLine,
            endColumn: attribute?.range?.endColumn,
            message: `${model.componentKey}: handler '${rawHandlerSymbol}' for event '${attribute.name}' on '${tagName}' does not cover required payload key(s) [${missingPayloadKeys.join(", ")}].`,
          });
          return;
        }

        if (attribute?.sourceType === "prop" && attribute?.name) {
          const schema = getContractPropSchema({
            contract,
            propName: attribute.name,
          });
          const expectedType = schemaNodeToLatticeType(schema);
          const actualType = inferAttributeExpressionType({ model, attribute });
          if (!areTypesCompatible({ expected: expectedType, actual: actualType })) {
            diagnostics.push({
              code: "RTGL-CHECK-COMPAT-004",
              severity: "error",
              filePath: bindingLine.filePath || model?.view?.filePath || "unknown",
              line: attribute?.range?.line || bindingLine.line,
              column: attribute?.range?.column,
              endLine: attribute?.range?.endLine,
              endColumn: attribute?.range?.endColumn,
              message: `${model.componentKey}: prop binding ':${attribute.name}' is incompatible with '${tagName}' expected type '${latticeTypeToText(expectedType)}' but resolved '${actualType}'.`,
            });
          }
        }

        if (attribute?.sourceType !== "boolean-attr" || !attribute?.name) {
          return;
        }
        const schema = getContractPropSchema({
          contract,
          propName: attribute.name,
        });
        const schemaType = schemaNodeToLatticeType(schema);
        if (areTypesCompatible({ expected: schemaType, actual: "boolean" })) {
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
          message: `${model.componentKey}: boolean binding '?${attribute.name}' is incompatible with '${tagName}' prop type '${latticeTypeToText(schemaType)}'.`,
        });
      });
    });
  });

  return diagnostics;
};
