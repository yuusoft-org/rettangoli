const ENCODED_ATTRIBUTE_PREFIX = "__rtgl_encoded_attribute__";

// JSON preserves lone UTF-16 surrogates; URI encoding keeps the complete value
// inside a single selector token. Decode once, after binding tokenization.
export const encodeTemplateAttribute = (value) => ENCODED_ATTRIBUTE_PREFIX + encodeURIComponent(
  JSON.stringify(value == null ? "" : String(value)),
);

export const decodeTemplateAttribute = (value) => value.startsWith(ENCODED_ATTRIBUTE_PREFIX)
  ? JSON.parse(decodeURIComponent(value.slice(ENCODED_ATTRIBUTE_PREFIX.length)))
  : value;
