export const toKebabCase = (value) => {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
};

export const toCamelCase = (value) => {
  return value.replace(/-([a-z0-9])/g, (_, chr) => chr.toUpperCase());
};

export const normalizeAttributeValue = (value) => {
  if (value === null || value === undefined) {
    return undefined;
  }
  return value === "" ? true : value;
};

export const readPropFallbackFromAttributes = (source, propName) => {
  const directAttrValue = source.getAttribute(propName);
  if (directAttrValue !== null) {
    return normalizeAttributeValue(directAttrValue);
  }
  const kebabPropName = toKebabCase(propName);
  if (kebabPropName !== propName) {
    const kebabAttrValue = source.getAttribute(kebabPropName);
    if (kebabAttrValue !== null) {
      return normalizeAttributeValue(kebabAttrValue);
    }
  }
  return undefined;
};

export const createPropsProxy = (source, allowedKeys) => {
  const allowed = new Set(allowedKeys);
  return new Proxy(
    {},
    {
      get(_, prop) {
        if (typeof prop === "string" && allowed.has(prop)) {
          const propValue = source[prop];
          if (propValue !== undefined) {
            return propValue;
          }
          return readPropFallbackFromAttributes(source, prop);
        }
        return undefined;
      },
      set() {
        throw new Error("Cannot assign to read-only proxy");
      },
      defineProperty() {
        throw new Error("Cannot define properties on read-only proxy");
      },
      deleteProperty() {
        throw new Error("Cannot delete properties from read-only proxy");
      },
      has(_, prop) {
        return typeof prop === "string" && allowed.has(prop);
      },
      ownKeys() {
        return [...allowed];
      },
      getOwnPropertyDescriptor(_, prop) {
        if (typeof prop === "string" && allowed.has(prop)) {
          return {
            configurable: true,
            enumerable: true,
            get: () => {
              const propValue = source[prop];
              if (propValue !== undefined) {
                return propValue;
              }
              return readPropFallbackFromAttributes(source, prop);
            },
          };
        }
        return undefined;
      },
    },
  );
};
