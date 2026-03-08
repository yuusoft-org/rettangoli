const normalizeAspectRatioValue = (value) => {
  return `${value}`.trim().replace(/\s*\/\s*/g, "/");
};

export const normalizeAspectRatio = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalizedValue = normalizeAspectRatioValue(value);
  if (normalizedValue.length === 0) {
    return undefined;
  }

  if (typeof CSS !== "undefined" && typeof CSS.supports === "function") {
    return CSS.supports("aspect-ratio", normalizedValue)
      ? normalizedValue
      : undefined;
  }

  return normalizedValue;
};
