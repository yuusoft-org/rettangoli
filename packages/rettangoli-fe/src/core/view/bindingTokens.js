// The one scanner for the binding part of a template key (the text after the
// selector), used by bindings.js and templatePropertyBindings.js. No imports.

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

// Assignments are matched before Jempl renders the key. Whitespace and quotes
// inside an interpolation belong to its value, including paths such as
// user["full name"]. A token without "=" is skipped here and read as a word.
const scanAssignments = (source) => {
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
    assignments.push({ name, value, quote, start, end: index });
  }
  return assignments;
};

// The text left once every assignment is cut out (each replaced by a space).
//
// Known quirk, kept so the output does not change: the original scan cut each
// assignment, in order, at the first place its text appeared, not at its own
// position. That place comes earlier only when the text before the assignment
// has a "=" of its own, and between assignments a "=" can only sit inside an
// interpolation, as in `${c ? "a=1" : ""} a=1`. Only then is the text cut by
// search.
const cutAssignments = (source, assignments) => {
  let leftover = "";
  let cursor = 0;
  for (const { start, end } of assignments) {
    const between = source.slice(cursor, start);
    if (between.includes("=")) {
      return assignments.reduce(
        (text, assignment) => text.replace(source.slice(assignment.start, assignment.end), " "),
        source,
      );
    }
    leftover += `${between} `;
    cursor = end;
  }
  return leftover + source.slice(cursor);
};

// Returns the `name=value` assignments in source order, each
// `{ name, value, quote, start, end }` (`name` keeps a `:`, `?` or `.` prefix;
// `quote` is the opening quote or undefined; `end` is past the closing quote),
// and the words: the whitespace-separated pieces of the text left between them.
export const tokenizeBindings = (source) => {
  const assignments = scanAssignments(source);
  const words = cutAssignments(source, assignments).split(/\s+/).filter(Boolean);
  return { assignments, words };
};
