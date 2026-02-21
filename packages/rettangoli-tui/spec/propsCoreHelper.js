import {
  createPropsProxy,
  normalizeAttributeValue,
  toCamelCase,
  toKebabCase,
} from "../src/core/runtime/props.js";

const createSource = ({ attrs = {}, props = {} } = {}) => {
  const attrMap = new Map(Object.entries(attrs));
  return {
    ...props,
    getAttribute(name) {
      if (!attrMap.has(name)) {
        return null;
      }
      return attrMap.get(name);
    },
  };
};

export const runPropsCoreCase = ({ scenario }) => {
  if (scenario === "to_camel_case") {
    return {
      value: toCamelCase("max-items"),
    };
  }

  if (scenario === "to_kebab_case") {
    return {
      value: toKebabCase("maxItems"),
    };
  }

  if (scenario === "normalize_empty_attr") {
    return {
      value: normalizeAttributeValue(""),
    };
  }

  if (scenario === "proxy_property_precedence") {
    const source = createSource({
      attrs: {
        value: "attrValue",
      },
      props: {
        value: "propValue",
      },
    });
    const proxy = createPropsProxy(source, ["value"]);
    return {
      value: proxy.value,
    };
  }

  if (scenario === "proxy_kebab_fallback") {
    const source = createSource({
      attrs: {
        "max-items": "12",
      },
      props: {},
    });
    const proxy = createPropsProxy(source, ["maxItems"]);
    return {
      value: proxy.maxItems,
    };
  }

  if (scenario === "proxy_readonly") {
    const source = createSource({
      attrs: {},
      props: {},
    });
    const proxy = createPropsProxy(source, ["value"]);
    proxy.value = "nope";
    return true;
  }

  throw new Error(`Unknown props core scenario '${scenario}'.`);
};
