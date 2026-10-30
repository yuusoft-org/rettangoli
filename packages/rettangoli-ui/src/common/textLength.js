// Browsers ignore a maxlength above the largest 32-bit signed integer.
const MAX_LENGTH_LIMIT = 2147483647;

// Character limits follow the native `maxlength` attribute: an integer from 0
// to 2147483647, counted in UTF-16 code units like `String#length`. Anything
// else means no limit.
export const parseMaxLength = (value) => {
  const limit =
    typeof value === "string" && /^\s*\d+\s*$/.test(value) ? Number(value) : value;
  return Number.isInteger(limit) && limit >= 0 && limit <= MAX_LENGTH_LIMIT
    ? limit
    : null;
};
