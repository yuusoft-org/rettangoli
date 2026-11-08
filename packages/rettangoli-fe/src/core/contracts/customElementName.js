// A valid custom element name: the HTML spec's PotentialCustomElementName
// grammar minus the reserved names, which browsers and jsdom all define.
// Chromium 143 also accepts a few more characters (such as ":" and "$");
// jsdom and older browsers reject them, so they are not allowed here.
// https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
const PCEN_CHAR =
  "\\-.0-9_a-z\\u00B7\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u037D\\u037F-\\u1FFF"
  + "\\u200C\\u200D\\u203F\\u2040\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF"
  + "\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\u{10000}-\\u{EFFFF}";

const POTENTIAL_CUSTOM_ELEMENT_NAME = new RegExp(
  `^[a-z][${PCEN_CHAR}]*-[${PCEN_CHAR}]*$`,
  "u",
);

const RESERVED_NAMES = new Set([
  "annotation-xml",
  "color-profile",
  "font-face",
  "font-face-src",
  "font-face-uri",
  "font-face-format",
  "font-face-name",
  "missing-glyph",
]);

export const isValidCustomElementName = (name) => {
  return (
    typeof name === "string"
    && POTENTIAL_CUSTOM_ELEMENT_NAME.test(name)
    && !RESERVED_NAMES.has(name)
  );
};
