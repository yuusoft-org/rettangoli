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

const REACTIVE_PROP_VALUES = Symbol("rtglReactivePropValues");
const NATIVE_HOST_STYLE = Symbol("rtglNativeHostStyle");

const findPrototypePropertyDescriptor = (source, propName) => {
  let current = Object.getPrototypeOf(source);

  while (current) {
    const descriptor = Object.getOwnPropertyDescriptor(current, propName);
    if (descriptor) {
      return descriptor;
    }
    current = Object.getPrototypeOf(current);
  }

  return undefined;
};

export const getNativeHostStyle = (source) => {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  if (Object.prototype.hasOwnProperty.call(source, NATIVE_HOST_STYLE)) {
    return source[NATIVE_HOST_STYLE];
  }

  const styleDescriptor = findPrototypePropertyDescriptor(source, "style");
  let nativeStyle;

  if (typeof styleDescriptor?.get === "function") {
    nativeStyle = styleDescriptor.get.call(source);
  } else if (source.style && typeof source.style === "object") {
    nativeStyle = source.style;
  }

  if (nativeStyle && typeof nativeStyle === "object") {
    Object.defineProperty(source, NATIVE_HOST_STYLE, {
      value: nativeStyle,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }

  return nativeStyle;
};

const ensureReactivePropValues = (source) => {
  if (!Object.prototype.hasOwnProperty.call(source, REACTIVE_PROP_VALUES)) {
    Object.defineProperty(source, REACTIVE_PROP_VALUES, {
      value: Object.create(null),
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }

  return source[REACTIVE_PROP_VALUES];
};

export const installReactiveProps = ({
  source,
  allowedKeys = [],
  onPropChange,
}) => {
  const reactiveValues = ensureReactivePropValues(source);

  if (allowedKeys.includes("style")) {
    getNativeHostStyle(source);
  }

  allowedKeys.forEach((propName) => {
    if (typeof propName !== "string" || propName.length === 0) {
      return;
    }

    const presetValue = Object.prototype.hasOwnProperty.call(source, propName)
      ? source[propName]
      : undefined;
    const hadPresetValue = Object.prototype.hasOwnProperty.call(source, propName);

    if (hadPresetValue) {
      delete source[propName];
    }

    Object.defineProperty(source, propName, {
      configurable: true,
      enumerable: true,
      get() {
        if (Object.prototype.hasOwnProperty.call(reactiveValues, propName)) {
          return reactiveValues[propName];
        }

        return readPropFallbackFromAttributes(source, propName);
      },
      set(value) {
        const oldValue = Object.prototype.hasOwnProperty.call(reactiveValues, propName)
          ? reactiveValues[propName]
          : readPropFallbackFromAttributes(source, propName);

        if (value === undefined) {
          delete reactiveValues[propName];
        } else {
          reactiveValues[propName] = value;
        }

        if (oldValue === value) {
          return;
        }

        onPropChange?.({
          propName,
          oldValue,
          newValue: value,
        });
      },
    });

    if (hadPresetValue) {
      reactiveValues[propName] = presetValue;
    }
  });
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
