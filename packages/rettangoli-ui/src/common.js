function css(strings, ...values) {
  // Combine the strings and values back into a single string
  let str = "";
  strings.forEach((string, i) => {
    str += string + (values[i] || "");
  });
  return str;
}

const mediaQueries = {
  none: undefined,
  s: "@media only screen and (max-width: 640px)",
};

const generateCSS = (styleMap, styles) => {
  let css = "";

  for (const [size, mediaQuery] of Object.entries(mediaQueries)) {
    if (size !== "none") {
      css += `${mediaQuery} {`;
    }
    for (const [attr, values] of Object.entries(styles)) {
      for (const [value, rule] of Object.entries(values)) {
        const cssProperty = styleMap[attr];
        const cssRule = rule.startsWith("--") ? `var(${rule})` : rule;

        const attributeWithBreakpoint =
          size === "none" ? attr : `${size}-${attr}`;
        const hoverAttributeWithBreakpoint =
          size === "none" ? `h-${attr}` : `${size}-h-${attr}`;

        if (cssProperty) {
          // Attribute is mapped in styleMap
          css += `
            :host([${attributeWithBreakpoint}="${value}"]) {
              ${cssProperty}: ${cssRule};
            }
            :host([${hoverAttributeWithBreakpoint}="${value}"]:hover) {
              ${cssProperty}: ${cssRule};
            }
          `;
        } else {
          // Attribute is not mapped, handle directly
          css += `
            :host([${attributeWithBreakpoint}="${value}"]) {
              ${rule}
            }
            :host([${hoverAttributeWithBreakpoint}="${value}"]:hover) {
              ${rule}
            }
          `;
        }
      }
    }
    if (size !== "none") {
      css += `}`;
    }
  }
  return css;
};


function endsWithDigit(inputValue) {
  if (inputValue === null) {
    return false;
  }
  if (inputValue.includes("/")) {
    return false;
  }
  // Convert the input value to a string if it's not already one.
  const inputStr = String(inputValue);
  // Check if the last character of the string is a digit.
  return /[0-9]$/.test(inputStr);
}

const endsWithPercentage = (inputStr) => {
  return /%$/.test(inputStr);
};

const dimensionWithUnit = (dimension) => {
  if (dimension === undefined) {
    return;
  }

  if (endsWithPercentage(dimension)) {
    return dimension;
  }

  if (endsWithDigit(dimension)) {
    return `${dimension}px`;
  }
  return dimension;
};


export { css, generateCSS, dimensionWithUnit };
