const getSortKey = (entry = {}, fallbackIndex = 0) => {
  if (entry && typeof entry === "object") {
    if (typeof entry.componentKey === "string") return `component:${entry.componentKey}`;
    if (typeof entry.id === "string") return `id:${entry.id}`;
    if (typeof entry.code === "string") {
      const filePath = entry.filePath || "";
      const line = Number.isInteger(entry.line) ? entry.line : 0;
      const column = Number.isInteger(entry.column) ? entry.column : 0;
      return `diag:${entry.code}:${filePath}:${line}:${column}:${entry.message || ""}`;
    }
    if (typeof entry.path === "string") return `path:${entry.path}`;
    if (typeof entry.expression === "string") {
      const line = Number.isInteger(entry.line) ? entry.line : 0;
      return `expr:${entry.expression}:${line}`;
    }
  }
  return `index:${fallbackIndex}`;
};

const shouldSortArrayByPath = (path = []) => {
  const joined = path.join(".");
  return [
    "structural.components",
    "structural.dependencies",
    "semantic.symbols",
    "semantic.scopes",
    "semantic.edges",
    "semantic.refs",
    "typedContract.components",
    "diagnostics.items",
  ].includes(joined);
};

export const canonicalizeIrValue = (value, path = []) => {
  if (Array.isArray(value)) {
    const normalized = value.map((entry, index) => canonicalizeIrValue(entry, [...path, String(index)]));
    if (shouldSortArrayByPath(path)) {
      return [...normalized].sort((left, right) => {
        const leftKey = getSortKey(left);
        const rightKey = getSortKey(right);
        return leftKey.localeCompare(rightKey);
      });
    }
    return normalized;
  }

  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort((left, right) => left.localeCompare(right));
    return keys.reduce((result, key) => {
      result[key] = canonicalizeIrValue(value[key], [...path, key]);
      return result;
    }, {});
  }

  return value;
};

export const serializeCompilerIr = (ir = {}) => {
  const canonical = canonicalizeIrValue(ir);
  return `${JSON.stringify(canonical, null, 2)}\n`;
};
