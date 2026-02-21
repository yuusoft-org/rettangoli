import { ansi } from "../tui/ansi.js";

const ANSI_SEQUENCE_REGEX = /\u001b\[[0-9;]*m/g;
const YES_VALUES = new Set(["", "1", "true", "yes", "on"]);
const FULLSCREEN_SIZE_TOKENS = new Set(["f", "full", "fullscreen", "100%", "max"]);
const SIZE_PRESETS = {
  sm: {
    widthRatio: 0.5,
    minWidth: 36,
    maxWidth: 56,
    maxHeight: 12,
  },
  md: {
    widthRatio: 0.64,
    minWidth: 44,
    maxWidth: 72,
    maxHeight: 16,
  },
  lg: {
    widthRatio: 0.78,
    minWidth: 56,
    maxWidth: 92,
    maxHeight: 22,
  },
};

const isTrue = (value) => {
  if (value === true || value === 1) {
    return true;
  }
  if (typeof value !== "string") {
    return false;
  }
  return YES_VALUES.has(value.toLowerCase());
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

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const toNumber = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }
  return Math.floor(numericValue);
};

const normalizeOptions = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null || value === "") {
    return [];
  }
  return [value];
};

const resolveOptionLabel = (option) => {
  if (option === undefined || option === null) {
    return "";
  }
  if (typeof option === "string" || typeof option === "number" || typeof option === "boolean") {
    return String(option);
  }
  if (typeof option === "object") {
    if (option.label !== undefined) {
      return String(option.label);
    }
    if (option.text !== undefined) {
      return String(option.text);
    }
    if (option.title !== undefined) {
      return String(option.title);
    }
    if (option.name !== undefined) {
      return String(option.name);
    }
    if (option.value !== undefined) {
      return String(option.value);
    }
  }
  return String(option);
};

const resolveTerminalSize = () => {
  const columns = Number(process?.stdout?.columns);
  const rows = Number(process?.stdout?.rows);
  return {
    width: Number.isFinite(columns) && columns > 0 ? Math.max(8, Math.floor(columns)) : 80,
    height: Number.isFinite(rows) && rows > 0 ? Math.max(8, Math.floor(rows)) : 24,
  };
};

const resolveDialogSize = (value) => {
  const token = String(value || "md").toLowerCase();
  if (FULLSCREEN_SIZE_TOKENS.has(token)) {
    return "f";
  }
  if (SIZE_PRESETS[token]) {
    return token;
  }
  return "md";
};

const resolveDialogFrame = ({
  size,
  optionCount,
  attrs,
  props,
  terminalWidth,
  terminalHeight,
}) => {
  if (size === "f") {
    return {
      width: terminalWidth,
      height: terminalHeight,
      x: 1,
      y: 1,
    };
  }

  const maxWidth = Math.max(18, terminalWidth - 2);
  const maxHeight = Math.max(8, terminalHeight - 2);
  const preset = SIZE_PRESETS[size] || SIZE_PRESETS.md;

  const widthValue = toNumber(props.w ?? attrs.w);
  const presetWidth = Math.floor(terminalWidth * preset.widthRatio);
  const defaultWidth = clamp(
    presetWidth,
    Math.min(preset.minWidth, maxWidth),
    Math.min(preset.maxWidth, maxWidth),
  );
  const width = clamp(widthValue ?? defaultWidth, 18, maxWidth);

  const heightValue = toNumber(props.h ?? attrs.h);
  const autoHeight = clamp(
    optionCount + 7,
    8,
    Math.min(preset.maxHeight, maxHeight),
  );
  const height = clamp(heightValue ?? autoHeight, 8, maxHeight);

  const defaultX = Math.max(1, Math.floor((terminalWidth - width) / 2) + 1);
  const defaultY = Math.max(1, Math.floor((terminalHeight - height) / 2) + 1);
  const xValue = toNumber(props.x ?? attrs.x);
  const yValue = toNumber(props.y ?? attrs.y);
  const x = clamp(xValue ?? defaultX, 1, Math.max(1, terminalWidth - width + 1));
  const y = clamp(yValue ?? defaultY, 1, Math.max(1, terminalHeight - height + 1));

  return {
    width,
    height,
    x,
    y,
  };
};

const normalizeChildLines = (value) => {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((entry) => String(entry ?? "").split("\n"))
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

const renderSelectorDialog = ({ attrs, props, renderChildren }) => {
  const open = isTrue(props.open ?? attrs.open);
  if (!open) {
    return "";
  }

  const title = String(props.title || attrs.title || "Select Option");
  const options = normalizeOptions(props.options ?? attrs.options);
  const size = resolveDialogSize(props.size ?? attrs.size);
  const safeSelectedIndex = clamp(
    Number(props.selectedIndex ?? attrs.selectedIndex) || 0,
    0,
    Math.max(0, options.length - 1),
  );
  const selectedOptionLabel = resolveOptionLabel(options[safeSelectedIndex]);
  const childLines = normalizeChildLines(renderChildren());
  const hint = String(
    props.hint
    || attrs.hint
    || childLines[0]
    || "Use ArrowUp/ArrowDown and Enter to select",
  );

  const terminalSize = resolveTerminalSize();
  const { width, height, x, y } = resolveDialogFrame({
    size,
    optionCount: options.length,
    attrs,
    props,
    terminalWidth: terminalSize.width,
    terminalHeight: terminalSize.height,
  });
  const innerWidth = Math.max(4, width - 4);
  const optionRows = Math.max(1, height - 7);

  const maxStart = Math.max(0, options.length - optionRows);
  const startIndex = clamp(
    safeSelectedIndex - Math.floor(optionRows / 2),
    0,
    maxStart,
  );

  const top = `╭${"─".repeat(width - 2)}╮`;
  const titleLine = `│ ${ansi.bold(pad(truncate(title, innerWidth), innerWidth))} │`;
  const hintLine = `│ ${ansi.dim(pad(truncate(hint, innerWidth), innerWidth))} │`;
  const divider = `├${"─".repeat(width - 2)}┤`;

  const optionLines = [];
  for (let rowIndex = 0; rowIndex < optionRows; rowIndex += 1) {
    const optionIndex = startIndex + rowIndex;
    const option = options[optionIndex];

    if (option === undefined) {
      optionLines.push(`│ ${" ".repeat(innerWidth)} │`);
      continue;
    }

    const prefix = optionIndex === safeSelectedIndex ? "> " : "  ";
    const optionLabel = resolveOptionLabel(option).replace(/\s*\n+\s*/g, " ");
    const optionText = `${prefix}${optionLabel}`;
    const content = pad(truncate(optionText, innerWidth), innerWidth);
    const styledContent = optionIndex === safeSelectedIndex
      ? ansi.bgCyan(ansi.fgBlack(content))
      : content;
    optionLines.push(`│ ${styledContent} │`);
  }

  if (options.length === 0) {
    optionLines[0] = `│ ${ansi.dim(pad("(no options)", innerWidth))} │`;
  }

  const footerLabel = options.length > 0
    ? `Selected: ${selectedOptionLabel}`
    : "Selected: (none)";
  const footerLine = `│ ${ansi.dim(pad(truncate(footerLabel, innerWidth), innerWidth))} │`;
  const bottom = `╰${"─".repeat(width - 2)}╯`;

  return {
    __rtglOverlay: true,
    x,
    y,
    lines: [top, titleLine, hintLine, divider, ...optionLines, divider, footerLine, bottom],
  };
};

export default renderSelectorDialog;
