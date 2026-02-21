const PRIMITIVE_TYPE_ORDER = [
  "unknown",
  "null",
  "boolean",
  "number",
  "string",
  "object",
  "array",
  "function",
  "any",
];

const PRIMITIVE_TYPE_SET = new Set(PRIMITIVE_TYPE_ORDER);

export const normalizePrimitiveType = (value) => {
  if (!value) {
    return "unknown";
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return "unknown";
  }

  if (normalized === "integer") {
    return "number";
  }

  if (PRIMITIVE_TYPE_SET.has(normalized)) {
    return normalized;
  }

  return "unknown";
};

export const schemaNodeToLatticeType = (schemaNode) => {
  if (!schemaNode || typeof schemaNode !== "object" || Array.isArray(schemaNode)) {
    return { kind: "unknown" };
  }

  const toUnion = (options = []) => {
    const normalized = [];
    const seen = new Set();

    options.forEach((option) => {
      if (!option || typeof option !== "object") {
        return;
      }
      if (option.kind === "union" && Array.isArray(option.options)) {
        option.options.forEach((nested) => {
          if (!nested || typeof nested !== "object" || !nested.kind) {
            return;
          }
          const key = JSON.stringify(nested);
          if (seen.has(key)) {
            return;
          }
          seen.add(key);
          normalized.push(nested);
        });
        return;
      }

      if (!option.kind) {
        return;
      }
      const key = JSON.stringify(option);
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      normalized.push(option);
    });

    if (normalized.length === 0) {
      return { kind: "unknown" };
    }
    if (normalized.length === 1) {
      return normalized[0];
    }
    return {
      kind: "union",
      options: normalized,
    };
  };

  const explicitType = schemaNode.type;
  if (Array.isArray(explicitType) && explicitType.length > 0) {
    const options = explicitType.map((entry) => schemaNodeToLatticeType({
      ...schemaNode,
      type: entry,
      nullable: false,
      anyOf: undefined,
      oneOf: undefined,
      allOf: undefined,
      enum: undefined,
    }));
    if (schemaNode.nullable === true) {
      options.push({ kind: "null" });
    }
    return toUnion(options);
  }

  if (Array.isArray(schemaNode.anyOf) && schemaNode.anyOf.length > 0) {
    const options = schemaNode.anyOf.map((entry) => schemaNodeToLatticeType(entry));
    if (schemaNode.nullable === true) {
      options.push({ kind: "null" });
    }
    return toUnion(options);
  }

  if (Array.isArray(schemaNode.oneOf) && schemaNode.oneOf.length > 0) {
    const options = schemaNode.oneOf.map((entry) => schemaNodeToLatticeType(entry));
    if (schemaNode.nullable === true) {
      options.push({ kind: "null" });
    }
    return toUnion(options);
  }

  if (Array.isArray(schemaNode.allOf) && schemaNode.allOf.length > 0) {
    const options = schemaNode.allOf.map((entry) => schemaNodeToLatticeType(entry));
    if (schemaNode.nullable === true) {
      options.push({ kind: "null" });
    }
    return toUnion(options);
  }

  if (Array.isArray(schemaNode.enum) && schemaNode.enum.length > 0) {
    const enumOptions = schemaNode.enum.map((value) => {
      if (value === null) return { kind: "null" };
      if (typeof value === "boolean") return { kind: "boolean" };
      if (typeof value === "number") return { kind: "number" };
      if (typeof value === "string") return { kind: "string" };
      if (Array.isArray(value)) return { kind: "array" };
      if (value && typeof value === "object") return { kind: "object" };
      return { kind: "unknown" };
    });
    return toUnion(enumOptions);
  }

  const type = normalizePrimitiveType(schemaNode.type);
  if (type === "array") {
    const arrayType = {
      kind: "array",
      items: schemaNodeToLatticeType(schemaNode.items),
    };
    if (schemaNode.nullable === true) {
      return toUnion([arrayType, { kind: "null" }]);
    }
    return arrayType;
  }

  if (type === "object") {
    const properties = schemaNode?.properties && typeof schemaNode.properties === "object" && !Array.isArray(schemaNode.properties)
      ? schemaNode.properties
      : {};
    const normalizedProperties = Object.entries(properties).reduce((result, [key, value]) => {
      result[key] = schemaNodeToLatticeType(value);
      return result;
    }, {});

    const objectType = {
      kind: "object",
      properties: normalizedProperties,
    };
    if (schemaNode.nullable === true) {
      return toUnion([objectType, { kind: "null" }]);
    }
    return objectType;
  }

  const primitiveType = { kind: type };
  if (schemaNode.nullable === true) {
    return toUnion([primitiveType, { kind: "null" }]);
  }
  return primitiveType;
};

export const inferLiteralLatticeType = (value = "") => {
  const source = String(value || "").trim();
  if (!source) {
    return { kind: "unknown" };
  }

  if (source === "null") {
    return { kind: "null" };
  }

  if (source === "true" || source === "false") {
    return { kind: "boolean" };
  }

  if (/^[-+]?(?:\d+\.?\d*|\d*\.?\d+)$/u.test(source)) {
    return { kind: "number" };
  }

  if ((source.startsWith("\"") && source.endsWith("\"")) || (source.startsWith("'") && source.endsWith("'"))) {
    return { kind: "string" };
  }

  if (source.startsWith("{") && source.endsWith("}")) {
    return { kind: "object" };
  }

  if (source.startsWith("[") && source.endsWith("]")) {
    return { kind: "array" };
  }

  return { kind: "unknown" };
};

export const inferSchemaNodePrimitiveType = (schemaNode) => {
  const latticeType = schemaNodeToLatticeType(schemaNode);
  if (latticeType.kind === "union" && Array.isArray(latticeType.options)) {
    const nonNull = latticeType.options.filter((option) => option?.kind && option.kind !== "null");
    if (nonNull.length === 1) {
      return nonNull[0].kind;
    }
    return "unknown";
  }
  return latticeType.kind || "unknown";
};

export const areTypesCompatible = ({ expected = "unknown", actual = "unknown" }) => {
  const flattenKinds = (value) => {
    if (typeof value === "string") {
      return new Set([normalizePrimitiveType(value)]);
    }
    if (!value || typeof value !== "object") {
      return new Set(["unknown"]);
    }
    if (value.kind === "union" && Array.isArray(value.options)) {
      const kinds = new Set();
      value.options.forEach((option) => {
        flattenKinds(option).forEach((kind) => kinds.add(kind));
      });
      return kinds.size > 0 ? kinds : new Set(["unknown"]);
    }
    return new Set([normalizePrimitiveType(value.kind)]);
  };

  const leftKinds = flattenKinds(expected);
  const rightKinds = flattenKinds(actual);

  if (leftKinds.has("any") || rightKinds.has("any")) {
    return true;
  }

  if (leftKinds.has("unknown") || rightKinds.has("unknown")) {
    return true;
  }

  for (const actualKind of rightKinds) {
    if (!leftKinds.has(actualKind)) {
      return false;
    }
  }

  return true;
};

export const compareTypeSpecificity = (left = "unknown", right = "unknown") => {
  const toComparableKind = (value) => {
    if (typeof value === "string") {
      return normalizePrimitiveType(value);
    }
    if (!value || typeof value !== "object") {
      return "unknown";
    }
    if (value.kind === "union" && Array.isArray(value.options) && value.options.length > 0) {
      const firstOption = value.options[0];
      return normalizePrimitiveType(firstOption?.kind || "unknown");
    }
    return normalizePrimitiveType(value.kind || "unknown");
  };

  const leftIndex = PRIMITIVE_TYPE_ORDER.indexOf(toComparableKind(left));
  const rightIndex = PRIMITIVE_TYPE_ORDER.indexOf(toComparableKind(right));

  return leftIndex - rightIndex;
};
