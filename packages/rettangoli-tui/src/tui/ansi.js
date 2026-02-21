const ESC = "\u001b[";

const wrap = (open, close) => {
  return (value) => `${ESC}${open}m${value}${ESC}${close}m`;
};

export const ansi = {
  reset: `${ESC}0m`,
  bold: wrap("1", "22"),
  dim: wrap("2", "22"),
  inverse: wrap("7", "27"),
  fgBlack: wrap("30", "39"),
  fgWhite: wrap("97", "39"),
  fgCyan: wrap("36", "39"),
  fgBlue: wrap("34", "39"),
  fgGreen: wrap("32", "39"),
  fgYellow: wrap("33", "39"),
  fgMagenta: wrap("35", "39"),
  fgGray: wrap("90", "39"),
  bgBlue: wrap("44", "49"),
  bgCyan: wrap("46", "49"),
  bgGray: wrap("100", "49"),
  bgGreen: wrap("42", "49"),
  bgYellow: wrap("43", "49"),
  bgMagenta: wrap("45", "49"),
};

export const padRight = (value, width) => {
  const text = String(value || "");
  if (text.length >= width) {
    return text.slice(0, width);
  }
  return `${text}${" ".repeat(width - text.length)}`;
};

export const colorTokenToStyledText = ({ token, text }) => {
  const value = String(text ?? "");
  switch (token) {
    case "success":
      return ansi.fgGreen(value);
    case "warning":
      return ansi.fgYellow(value);
    case "muted":
      return ansi.fgGray(value);
    case "info":
      return ansi.fgBlue(value);
    default:
      return value;
  }
};
