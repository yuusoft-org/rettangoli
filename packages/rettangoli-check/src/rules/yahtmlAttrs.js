import { toCamelCase, toKebabCase } from "../utils/case.js";
import { isValidAttributeName } from "../core/fe-contracts.js";
import { getRegistryLoadFailures } from "../core/registry.js";
import { escapeRegExp, isConvertibleLegacyBinding, normalizeBindingName } from "./shared.js";

const GENERIC_ALLOWED_ATTRS = new Set([
  "accesskey",
  "autocapitalize",
  "autofocus",
  "id",
  "class",
  "contenteditable",
  "dir",
  "draggable",
  "enterkeyhint",
  "exportparts",
  "hidden",
  "inert",
  "inputmode",
  "lang",
  "nonce",
  "part",
  "popover",
  "itemid",
  "itemprop",
  "itemref",
  "itemscope",
  "itemtype",
  "spellcheck",
  "style",
  "slot",
  "tabindex",
  "title",
  "translate",
  "name",
  "key",
  "href",
  "new-tab",
  "rel",
]);

const isDynamicToken = (value = "") => {
  return (
    value.includes("${")
    || value.includes("#{")
    || value.includes("{{")
    || value.includes("}")
    || value.includes("{")
  );
};

const toCompactLower = (value = "") => {
  return String(value).replaceAll("-", "").toLowerCase();
};

const getGenericAttrCandidates = (attrName = "") => {
  if (!attrName) {
    return [];
  }

  const raw = String(attrName);
  const lower = raw.toLowerCase();
  const kebab = toKebabCase(raw);
  const compact = toCompactLower(kebab);

  return [...new Set([raw, lower, kebab, compact])];
};

const isGenericAllowed = (attrName = "") => {
  if (!attrName) {
    return true;
  }

  return getGenericAttrCandidates(attrName).some((candidate) => {
    if (GENERIC_ALLOWED_ATTRS.has(candidate)) {
      return true;
    }

    if (candidate.startsWith("aria-") || candidate.startsWith("data-")) {
      return true;
    }

    return candidate === "role";
  });
};

const isAllowedByContract = ({ attrName, contract }) => {
  const raw = attrName;
  const kebab = toKebabCase(attrName);
  const camel = toCamelCase(attrName);

  return (
    contract.attrs.has(raw)
    || contract.attrs.has(kebab)
    || contract.attrs.has(camel)
    || contract.props.has(raw)
    || contract.props.has(kebab)
    || contract.props.has(camel)
  );
};

export const runYahtmlAttrRules = ({ models = [], registry = new Map() }) => {
  const diagnostics = [];
  // A primitive that failed to load has only its static contract (REGISTRY-001); its
  // runtime-only attributes are unknown, so do not report them as unsupported.
  const failedTags = new Set(getRegistryLoadFailures(registry).map(({ tagName }) => tagName));

  models.forEach((model) => {
    const templateNodes = Array.isArray(model?.view?.templateAst?.nodes)
      ? model.view.templateAst.nodes
      : [];
    const nodeByKey = new Map();
    templateNodes.forEach((node) => {
      const key = `${node?.range?.line || 0}::${node?.rawKey || ""}`;
      nodeByKey.set(key, node);
    });

    model.view.selectorBindings.forEach((bindingLine) => {
      const { tagName, bindingNames, filePath, line } = bindingLine;
      if (!tagName || !tagName.includes("-")) {
        return;
      }

      const contract = registry.get(tagName);
      if (!contract) {
        diagnostics.push({
          code: "RTGL-CHECK-YAHTML-001",
          severity: "error",
          filePath,
          line,
          message: `${model.componentKey}: unknown custom element '${tagName}' in view template.`,
        });
        return;
      }

      const astNode = nodeByKey.get(`${line || 0}::${bindingLine.rawKey || ""}`);
      const astAttributes = Array.isArray(astNode?.attributes) ? astNode.attributes : [];
      const astBindingNames = astAttributes
        .map((attribute) => attribute?.bindingName)
        .filter(Boolean);
      // Source order: names with an attribute node in token order, then the others (object-notation keys, names
      // FE reads inside a value that the AST keeps as one token).
      const allBindingNames = [...new Set([...astBindingNames, ...(bindingNames || [])])];

      allBindingNames.forEach((bindingName) => {
        if (!bindingName || isDynamicToken(bindingName)) {
          return;
        }
        // Names FE parseNodeBindings rejects ('@event', '=x', '1invalid', a lone ':') are
        // RTGL-CHECK-BINDING-001. FE accepts any other ':' name and ignores '.' names.
        const feRejects = bindingName.startsWith(":")
          ? bindingName === ":"
          : !bindingName.startsWith(".") && !isValidAttributeName(bindingName.replace(/^\?/, ""));
        if (feRejects) {
          return;
        }

        const normalized = normalizeBindingName(bindingName);
        const matchingAttrNode = astAttributes.find((attribute) => attribute.bindingName === bindingName);
        const diagnosticColumn = Number.isInteger(matchingAttrNode?.range?.column)
          ? matchingAttrNode.range.column
          : undefined;
        const diagnosticEndColumn = Number.isInteger(matchingAttrNode?.range?.endColumn)
          ? matchingAttrNode.range.endColumn
          : undefined;

        if (normalized.sourceType === "legacy-prop") {
          diagnostics.push({
            code: "RTGL-CHECK-YAHTML-002",
            severity: "error",
            filePath,
            line,
            column: diagnosticColumn,
            endLine: line,
            endColumn: diagnosticEndColumn,
            message: `${model.componentKey}: legacy '.${normalized.name}' binding is not supported. Use ':${normalized.name}'.`,
            fix: isConvertibleLegacyBinding({ key: bindingLine.rawKey, bindingName }) ? {
              kind: "line-regex-replace",
              filePath,
              line,
              pattern: `(^|\\s)\\.${escapeRegExp(normalized.name)}=(?=\\$\\{)`,
              replacement: `$1:${normalized.name}=`,
              flags: "g",
              description: `Convert '.${normalized.name}=\${...}' to ':${normalized.name}=\${...}'.`,
              safe: true,
              confidence: 0.98,
            } : undefined,
          });
          return;
        }

        const attrName = normalized.name;
        if (!attrName || isDynamicToken(attrName)) {
          return;
        }

        if (isGenericAllowed(attrName)) {
          return;
        }

        if (isAllowedByContract({ attrName, contract }) || failedTags.has(tagName)) {
          return;
        }

        diagnostics.push({
          code: "RTGL-CHECK-YAHTML-003",
          severity: "error",
          filePath,
          line,
          column: diagnosticColumn,
          endLine: line,
          endColumn: diagnosticEndColumn,
          message: `${model.componentKey}: unsupported attr/prop '${attrName}' on '${tagName}'.`,
        });
      });
    });
  });

  return diagnostics;
};
