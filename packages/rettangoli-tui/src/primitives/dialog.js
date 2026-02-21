import { ansi } from "../tui/ansi.js";
import { resolveWidth } from "./common.js";

const ANSI_SEQUENCE_REGEX = /\u001b\[[0-9;]*m/g;

const isOpen = (value) => {
  if (value === true || value === "" || value === 1 || value === "1") {
    return true;
  }

  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "on";
  }

  return false;
};

const stripAnsi = (value) => String(value ?? "").replace(ANSI_SEQUENCE_REGEX, "");

const visibleLength = (value) => stripAnsi(value).length;

const readAnsiSequence = (text, index) => {
  if (text[index] !== "\u001b") {
    return "";
  }
  const match = text.slice(index).match(/^\u001b\[[0-9;]*m/);
  return match ? match[0] : "";
};

const truncate = (value, width) => {
  const text = String(value ?? "");
  if (width <= 0) {
    return "";
  }

  let visible = 0;
  let index = 0;
  let output = "";
  let hitWidth = false;

  while (index < text.length) {
    const ansiSequence = readAnsiSequence(text, index);
    if (ansiSequence) {
      output += ansiSequence;
      index += ansiSequence.length;
      continue;
    }

    if (visible >= width) {
      hitWidth = true;
      break;
    }

    output += text[index];
    visible += 1;
    index += 1;
  }

  if (hitWidth) {
    while (index < text.length) {
      const ansiSequence = readAnsiSequence(text, index);
      if (!ansiSequence) {
        break;
      }
      output += ansiSequence;
      index += ansiSequence.length;
    }
  }

  return output;
};

const pad = (value, width) => {
  const text = String(value ?? "");
  if (visibleLength(text) >= width) {
    return text;
  }
  return `${text}${" ".repeat(width - visibleLength(text))}`;
};

const resolvePosition = (value, fallback) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.max(1, Math.floor(numericValue));
};

const normalizeBodyLines = (value) => {
  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap((entry) => String(entry ?? "").split("\n"))
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
};

const renderDialog = ({ attrs, props, renderChildren }) => {
  const open = isOpen(props.open ?? attrs.open);
  if (!open) {
    return "";
  }

  const title = String(props.title || attrs.title || "Dialog");
  const width = Math.max(18, resolveWidth(props.w || attrs.w, 54));
  const x = resolvePosition(props.x || attrs.x, 8);
  const y = resolvePosition(props.y || attrs.y, 8);

  const innerWidth = width - 4;
  const bodyLines = normalizeBodyLines(renderChildren());
  const content = bodyLines.length > 0
    ? bodyLines
    : [ansi.dim("(empty)")];

  const top = `╭${"─".repeat(width - 2)}╮`;
  const titleText = pad(truncate(title, innerWidth), innerWidth);
  const titleLine = `│ ${ansi.bold(titleText)} │`;
  const divider = `├${"─".repeat(width - 2)}┤`;
  const body = content.map((line) => {
    return `│ ${pad(truncate(line, innerWidth), innerWidth)} │`;
  });
  const bottom = `╰${"─".repeat(width - 2)}╯`;

  return {
    __rtglOverlay: true,
    x,
    y,
    lines: [top, titleLine, divider, ...body, bottom],
  };
};

export default renderDialog;
