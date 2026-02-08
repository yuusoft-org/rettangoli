export const yamlToCss = (_elementName, styleObject) => {
  if (!styleObject || typeof styleObject !== "object") {
    return "";
  }

  let css = ``;
  const convertPropertiesToCss = (properties) => {
    return Object.entries(properties)
      .map(([property, value]) => `  ${property}: ${value};`)
      .join("\n");
  };

  const processSelector = (selector, rules) => {
    if (typeof rules !== "object" || rules === null) {
      return "";
    }

    if (selector.startsWith("@")) {
      const nestedCss = Object.entries(rules)
        .map(([nestedSelector, nestedRules]) => {
          const nestedProperties = convertPropertiesToCss(nestedRules);
          return `  ${nestedSelector} {\n${nestedProperties
            .split("\n")
            .map((line) => (line ? `  ${line}` : ""))
            .join("\n")}\n  }`;
        })
        .join("\n");

      return `${selector} {\n${nestedCss}\n}`;
    }

    const properties = convertPropertiesToCss(rules);
    return `${selector} {\n${properties}\n}`;
  };

  Object.entries(styleObject).forEach(([selector, rules]) => {
    const selectorCss = processSelector(selector, rules);
    if (selectorCss) {
      css += (css ? "\n\n" : "") + selectorCss;
    }
  });

  return css;
};
