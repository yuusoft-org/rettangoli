// A non-null, non-array object (YAML mappings, JSON objects, option bags).
export function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

// Merge plain objects recursively; any other source value replaces the target value.
export function deepMerge(target, source) {
  if (!isPlainObject(source)) {
    return source;
  }

  if (!isPlainObject(target)) {
    return { ...source };
  }

  const output = { ...target };

  Object.keys(source).forEach(key => {
    if (isPlainObject(source[key]) && isPlainObject(target[key])) {
      output[key] = deepMerge(target[key], source[key]);
      return;
    }

    Object.assign(output, { [key]: source[key] });
  });

  return output;
}
