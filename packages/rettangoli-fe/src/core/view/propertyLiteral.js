const NUMBER_LITERAL = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/;

export const parsePropertyLiteral = (value) => {
  if (value === "true") return { value: true };
  if (value === "false") return { value: false };
  if (value === "null") return { value: null };
  if (value === "undefined") return { value: undefined };
  if (NUMBER_LITERAL.test(value)) return { value: Number(value) };
  return undefined;
};
