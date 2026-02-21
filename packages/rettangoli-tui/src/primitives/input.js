import { ansi } from "../tui/ansi.js";

const renderInput = ({ attrs, props }) => {
  const label = attrs.label || props.label;
  const value = props.value ?? attrs.value;
  const placeholder = attrs.placeholder || props.placeholder || "";
  const content = value === undefined || value === null || value === ""
    ? ansi.dim(placeholder || "")
    : String(value);

  const field = `${ansi.bgGray(" " + content + " ")}`;

  if (label) {
    return `${ansi.fgGray(`${label}:`)} ${field}`;
  }

  return field;
};

export default renderInput;
