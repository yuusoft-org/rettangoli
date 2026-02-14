export const toKebabCase = (value = "") => {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
};

export const toCamelCase = (value = "") => {
  return String(value).replace(/-([a-z0-9])/g, (_, chr) => chr.toUpperCase());
};
