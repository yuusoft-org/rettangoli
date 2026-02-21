const spacingTokenMap = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 6,
};

export const normalizeLineOutput = (value) => {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
};

export const normalizeLines = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeLineOutput(entry))
      .filter((entry) => entry.length > 0);
  }

  const text = normalizeLineOutput(value);
  if (!text) {
    return [];
  }

  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
};

export const resolveSpacing = (value) => {
  if (value === undefined || value === null || value === "") {
    return 1;
  }

  if (typeof value === "number") {
    return Math.max(1, value);
  }

  if (spacingTokenMap[value]) {
    return spacingTokenMap[value];
  }

  const numericValue = Number(value);
  if (!Number.isNaN(numericValue)) {
    return Math.max(1, numericValue);
  }

  return 1;
};

export const resolveWidth = (value, fallback = 24) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return fallback;
  }

  return Math.max(1, Math.floor(numericValue));
};

export const resolveTerminalWidth = (value, fallback = 72) => {
  const token = String(value ?? "").toLowerCase();
  if (token === "f" || token === "full" || token === "100%" || token === "max") {
    const columns = Number(process?.stdout?.columns);
    if (Number.isFinite(columns) && columns > 0) {
      return Math.max(20, Math.floor(columns));
    }
  }

  return resolveWidth(value, fallback);
};

export const resolveTextContent = ({ text, joinChildren }) => {
  if (text !== undefined && text !== null && String(text).length > 0) {
    return String(text);
  }
  return joinChildren("");
};
