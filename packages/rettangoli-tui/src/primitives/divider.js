import { resolveWidth } from "./common.js";

const resolveOrientation = ({ attrs, props }) => {
  const token = String(
    attrs.o
      || props.o
      || attrs.orientation
      || props.orientation
      || attrs.d
      || props.d
      || "h",
  ).toLowerCase();

  if (token === "v" || token === "vertical") {
    return "vertical";
  }
  return "horizontal";
};

const renderDivider = ({ attrs, props }) => {
  const orientation = resolveOrientation({ attrs, props });
  const customChar = String(attrs.c || props.c || "");

  if (orientation === "vertical") {
    const height = resolveWidth(attrs.h || props.h, 3);
    const char = customChar ? customChar[0] : "│";
    return Array.from({ length: height }, () => char).join("\n");
  }

  const width = resolveWidth(attrs.w || props.w, 40);
  const char = customChar ? customChar[0] : "─";
  return char.repeat(width);
};

export default renderDivider;
