// Character limits follow the native `maxlength` attribute: a non-negative
// integer, counted in UTF-16 code units like `String#length`. Anything else
// means no limit.
export const parseMaxLength = (value) => {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value === "string" && /^\s*\d+\s*$/.test(value)) {
    return Number(value);
  }
  return null;
};
