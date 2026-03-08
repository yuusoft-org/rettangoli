export const flattenArrays = (items) => {
  if (!Array.isArray(items)) {
    return items;
  }

  return items.reduce((acc, item) => {
    if (Array.isArray(item)) {
      acc.push(...flattenArrays(item));
    } else {
      if (item && typeof item === "object") {
        const entries = Object.entries(item);
        if (entries.length > 0) {
          const [key, value] = entries[0];
          if (Array.isArray(value)) {
            item = { [key]: flattenArrays(value) };
          }
        }
      }
      acc.push(item);
    }
    return acc;
  }, []);
};
