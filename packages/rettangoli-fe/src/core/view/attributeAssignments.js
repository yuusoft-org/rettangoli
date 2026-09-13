const isSpace = (character) => /\s/.test(character);

const skipInterpolation = (source, start) => {
  let depth = 1;
  let quote;
  let index = start + 2;
  while (index < source.length && depth > 0) {
    const character = source[index++];
    if (quote) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = undefined;
    } else if (character === '"' || character === "'") quote = character;
    else if (character === "{") depth += 1;
    else if (character === "}") depth -= 1;
  }
  return index;
};

const startsInterpolation = (source, index) => (
  (source[index] === "$" || source[index] === "#") && source[index + 1] === "{"
);

// Match assignments before evaluating Jempl. Whitespace and quotes inside an
// interpolation belong to its value, including paths such as user["full name"].
// The match shape is shared with the rendered-binding parser's regex matches.
export const getAttributeAssignments = (source) => {
  const assignments = [];
  let index = 0;
  while (index < source.length) {
    while (index < source.length && isSpace(source[index])) index += 1;
    const start = index;
    while (index < source.length && !isSpace(source[index]) && source[index] !== "=") {
      index = startsInterpolation(source, index) ? skipInterpolation(source, index) : index + 1;
    }
    if (source[index] !== "=") continue;
    const name = source.slice(start, index++);
    const quote = source[index] === '"' || source[index] === "'" ? source[index++] : undefined;
    const valueStart = index;
    let brackets = 0;
    while (index < source.length) {
      if (startsInterpolation(source, index)) index = skipInterpolation(source, index);
      else if (!quote && source[index] === "[") { brackets += 1; index += 1; }
      else if (!quote && source[index] === "]") { brackets -= 1; index += 1; }
      else if (!quote && brackets > 0 && (source[index] === '"' || source[index] === "'")) {
        const pathQuote = source[index++];
        while (index < source.length && source[index] !== pathQuote) {
          index += source[index] === "\\" ? 2 : 1;
        }
        if (source[index] === pathQuote) index += 1;
      }
      else if (quote ? source[index] === quote : brackets <= 0 && isSpace(source[index])) break;
      else index += 1;
    }
    const value = source.slice(valueStart, index);
    if (quote && source[index] === quote) index += 1;
    const match = [source.slice(start, index), name, undefined, undefined, undefined];
    match[quote === '"' ? 2 : quote === "'" ? 3 : 4] = value;
    match.index = start;
    assignments.push(match);
  }
  return assignments;
};
