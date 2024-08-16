function css(strings, ...values) {
  // Combine the strings and values back into a single string
  let str = "";
  strings.forEach((string, i) => {
    str += string + (values[i] || "");
  });
  return str;
}

const generateCSS = (styleMap, styles) => {
  let css = "";

  for (const [attr, values] of Object.entries(styles)) {
    for (const [value, rule] of Object.entries(values)) {
      const cssProperty = styleMap[attr];
      const cssRule = rule.startsWith('--') ? `var(${rule})` : rule;

      if (cssProperty) {
        // Attribute is mapped in styleMap
        css += `
          :host([${attr}="${value}"]) {
            ${cssProperty}: ${cssRule};
          }
          :host([h-${attr}="${value}"]:hover) {
            ${cssProperty}: ${cssRule};
          }
        `;
      } else {
        // Attribute is not mapped, handle directly
        css += `
          :host([${attr}="${value}"]) {
            ${rule}
          }
          :host([h-${attr}="${value}"]:hover) {
            ${rule}
          }
        `;
      }
    }
  }

  return css;
};

export { css, generateCSS };
