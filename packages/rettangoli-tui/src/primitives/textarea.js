import { ansi } from "../tui/ansi.js";
import { resolveWidth } from "./common.js";

const YES_VALUES = new Set(["", "1", "true", "yes", "on"]);

const isTrue = (value) => {
  if (value === true || value === 1) {
    return true;
  }
  if (typeof value !== "string") {
    return false;
  }
  return YES_VALUES.has(value.toLowerCase());
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const toNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.floor(numericValue);
};

const normalizeRows = (value) => {
  const rows = String(value ?? "").split("\n");
  return rows.length > 0 ? rows : [""];
};

const pad = (value, width) => {
  if (value.length >= width) {
    return value.slice(0, width);
  }
  return `${value}${" ".repeat(width - value.length)}`;
};

const withCursor = (line, cursorColumn, width) => {
  const safeColumn = clamp(cursorColumn, 0, width - 1);
  const before = line.slice(0, safeColumn);
  const char = line[safeColumn] || " ";
  const after = line.slice(safeColumn + 1);
  return `${before}${ansi.inverse(char)}${after}`;
};

const renderTextarea = ({ attrs, props }) => {
  const label = attrs.label || props.label;
  const value = props.value ?? attrs.value ?? "";
  const placeholder = attrs.placeholder || props.placeholder || "";
  const isActive = isTrue(props.active ?? attrs.active);

  const width = Math.max(12, resolveWidth(props.w || attrs.w, 54));
  const height = Math.max(2, resolveWidth(props.h || attrs.h, 5));
  const innerWidth = width - 4;

  const cursorRow = clamp(
    toNumber(props.cursorRow ?? attrs.cursorRow, 0),
    0,
    height - 1,
  );
  const cursorCol = clamp(
    toNumber(props.cursorCol ?? attrs.cursorCol, 0),
    0,
    Math.max(0, innerWidth - 1),
  );

  const rows = normalizeRows(value);
  const hasValue = String(value).length > 0;
  const visibleRows = [];

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    if (!hasValue && rowIndex === 0 && placeholder) {
      let line = pad(placeholder, innerWidth);
      if (isActive && cursorRow === rowIndex) {
        line = withCursor(line, cursorCol, innerWidth);
      } else {
        line = ansi.dim(line);
      }
      visibleRows.push(`│ ${line} │`);
      continue;
    }

    const sourceLine = rows[rowIndex] || "";
    let offset = 0;

    if (isActive && rowIndex === cursorRow && sourceLine.length >= innerWidth) {
      offset = clamp(cursorCol - (innerWidth - 1), 0, sourceLine.length - (innerWidth - 1));
    }

    let line = pad(sourceLine.slice(offset, offset + innerWidth), innerWidth);

    if (isActive && rowIndex === cursorRow) {
      line = withCursor(line, cursorCol - offset, innerWidth);
    }

    visibleRows.push(`│ ${line} │`);
  }

  const top = `╭${"─".repeat(width - 2)}╮`;
  const bottom = `╰${"─".repeat(width - 2)}╯`;

  const lines = [top, ...visibleRows, bottom];
  if (label) {
    return `${ansi.fgGray(`${label}:`)}\n${lines.join("\n")}`;
  }

  return lines.join("\n");
};

export default renderTextarea;
