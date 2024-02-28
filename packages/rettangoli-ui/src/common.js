function css(strings, ...values) {
  // Combine the strings and values back into a single string
  let str = "";
  strings.forEach((string, i) => {
    str += string + (values[i] || "");
  });
  return str;
}

export { css };
