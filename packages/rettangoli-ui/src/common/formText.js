// rtgl-form renders every string in its `form` prop as a jempl template, so
// `${name}` and `#{name}` in user text are expanded. A word joiner between
// the sigil and the brace stops the expansion and stays invisible.
export const escapeFormText = (text) =>
  String(text).replace(/([$#])\{/g, "$1\u2060{");
