function css(strings, ...values) {
  // Combine the strings and values back into a single string
  let str = "";
  strings.forEach((string, i) => {
    str += string + (values[i] || "");
  });
  return str;
}

const mediaQueries = {
  default: undefined,
  xl: "@media only screen and (max-width: 1280px)",
  lg: "@media only screen and (max-width: 1024px)",
  md: "@media only screen and (max-width: 768px)",
  sm: "@media only screen and (max-width: 640px)",
};

const generateCSS = (styleMap, styles, descendants = {}) => {
  let css = "";

  for (const [size, mediaQuery] of Object.entries(mediaQueries)) {
    if (size !== "default") {
      css += `${mediaQuery} {`;
    }
    for (const [attr, values] of Object.entries(styles)) {
      const dscendant = descendants[attr] ? ` ${descendants[attr]} ` : ' ';
      for (const [value, rule] of Object.entries(values)) {
        const cssProperties = styleMap[attr];
        const cssRule = rule.startsWith("--") ? `var(${rule})` : rule;

        const attributeWithBreakpoint =
          size === "default" ? attr : `${size}-${attr}`;
        const hoverAttributeWithBreakpoint =
          size === "default" ? `h-${attr}` : `${size}-h-${attr}`;

        if (cssProperties) {
          // Handle multiple properties if mapped in styleMap
          const properties = cssProperties.split(" ");
          let propertyRules = properties
            .map((property) => `${property}: ${cssRule};`)
            .join(" ");

          css += `
            :host([${attributeWithBreakpoint}="${value}"])${dscendant}{
              ${propertyRules}
            }
            :host([${hoverAttributeWithBreakpoint}="${value}"]:hover)${dscendant}{
              ${propertyRules}
            }
          `;
        } else {
          // Attribute is not mapped, handle directly
          css += `
            :host([${attributeWithBreakpoint}="${value}"])${dscendant}{
              ${rule}
            }
            :host([${hoverAttributeWithBreakpoint}="${value}"]:hover)${dscendant}{
              ${rule}
            }
          `;
        }
      }
    }
    if (size !== "default") {
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

const spacing = {
  xs: "--spacing-xs",
  s: "--spacing-s",
  m: "--spacing-m",
  l: "--spacing-l",
  xl: "--spacing-xl",
};


function convertObjectToCssString(styleObject) {
  let result = ''
  for (const [size, mediaQuery] of Object.entries(mediaQueries)) {
    if (size !== "default") {
      result += `${mediaQuery} {\n`;
    }
    let cssString = '';
    for (const [key, value] of Object.entries(styleObject[size])) {
      if (value !== undefined && value !== null) { 
        cssString += `${key}: ${value};\n`;
      }
    }
    result += `:host {
    ${cssString.trim()}
    }\n`;

    if (size !== "default") {
      result += `}\n`;
    }
  }
  return result;
}


export { css, generateCSS, dimensionWithUnit, spacing, convertObjectToCssString, mediaQueries };
