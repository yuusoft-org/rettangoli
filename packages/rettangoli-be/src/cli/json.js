const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeForStableJson = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForStableJson(entry));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, normalizeForStableJson(value[key])]),
  );
};

export const stringifyStableJson = (value) => {
  return `${JSON.stringify(normalizeForStableJson(value), null, 2)}\n`;
};
