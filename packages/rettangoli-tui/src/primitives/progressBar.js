import { ansi } from "../tui/ansi.js";
import { resolveTerminalWidth, resolveTextContent } from "./common.js";

const DEFAULT_BAR_WIDTH = 24;
const YES_VALUES = new Set(["", "1", "true", "yes", "on"]);

const COLOR_MAP = {
  blue: ansi.fgBlue,
  cyan: ansi.fgCyan,
  gray: ansi.fgGray,
  green: ansi.fgGreen,
  magenta: ansi.fgMagenta,
  yellow: ansi.fgYellow,
};

const STATUS_COLOR_MAP = {
  done: ansi.fgGreen,
  doing: ansi.fgCyan,
  "in-progress": ansi.fgCyan,
  todo: ansi.fgYellow,
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const toNumber = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }
  return numericValue;
};

const isTrue = (value, fallback = false) => {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (value === true || value === 1) {
    return true;
  }
  if (value === false || value === 0) {
    return false;
  }
  if (typeof value !== "string") {
    return fallback;
  }
  return YES_VALUES.has(value.trim().toLowerCase());
};

const resolvePrecision = ({ attrs, props }) => {
  const numericValue = toNumber(props.precision ?? attrs.precision);
  if (numericValue === null) {
    return 0;
  }
  return clamp(Math.floor(numericValue), 0, 2);
};

const resolvePercent = ({ attrs, props }) => {
  const explicitPercent = toNumber(
    props.percent
      ?? attrs.percent
      ?? props.p
      ?? attrs.p,
  );

  if (explicitPercent !== null) {
    return clamp(explicitPercent, 0, 100);
  }

  const value = toNumber(props.value ?? attrs.value ?? 0) ?? 0;
  const max = toNumber(props.max ?? attrs.max ?? props.total ?? attrs.total ?? 100) ?? 100;
  if (max <= 0) {
    return 0;
  }
  return clamp((value / max) * 100, 0, 100);
};

const resolveColorFn = ({ attrs, props }) => {
  const colorToken = String(props.color ?? attrs.color ?? "").trim().toLowerCase();
  if (COLOR_MAP[colorToken]) {
    return COLOR_MAP[colorToken];
  }

  const statusToken = String(props.status ?? attrs.status ?? "").trim().toLowerCase();
  if (STATUS_COLOR_MAP[statusToken]) {
    return STATUS_COLOR_MAP[statusToken];
  }

  return (value) => value;
};

const resolveLabel = ({ attrs, props, text, joinChildren }) => {
  const explicitLabel = props.label ?? attrs.label;
  if (explicitLabel !== undefined && explicitLabel !== null) {
    return String(explicitLabel).trim();
  }

  const safeJoinChildren = typeof joinChildren === "function"
    ? joinChildren
    : () => "";
  return String(resolveTextContent({ text, joinChildren: safeJoinChildren })).trim();
};

const resolveFillChars = ({ attrs, props }) => {
  const fillCharToken = String(props.fill ?? attrs.fill ?? "█");
  const emptyCharToken = String(props.empty ?? attrs.empty ?? "░");

  return {
    fillChar: fillCharToken[0] || "█",
    emptyChar: emptyCharToken[0] || "░",
  };
};

const formatPercentText = (percent, precision) => {
  if (precision <= 0) {
    return `${Math.round(percent)}%`;
  }
  return `${percent.toFixed(precision)}%`;
};

const renderProgressBar = ({ attrs = {}, props = {}, text, joinChildren }) => {
  const precision = resolvePrecision({ attrs, props });
  const percent = resolvePercent({ attrs, props });
  const barWidth = resolveTerminalWidth(props.w ?? attrs.w, DEFAULT_BAR_WIDTH);
  const showPercent = isTrue(
    props.showPercent ?? attrs.showPercent ?? props.showValue ?? attrs.showValue,
    true,
  );
  const label = resolveLabel({ attrs, props, text, joinChildren });
  const { fillChar, emptyChar } = resolveFillChars({ attrs, props });
  const colorFn = resolveColorFn({ attrs, props });

  const filledCells = clamp(
    Math.round((percent / 100) * barWidth),
    0,
    barWidth,
  );

  const filled = colorFn(fillChar.repeat(filledCells));
  const empty = emptyChar.repeat(Math.max(0, barWidth - filledCells));
  const bar = `[${filled}${empty}]`;
  const percentText = showPercent
    ? formatPercentText(percent, precision)
    : "";

  return [label, bar, percentText].filter(Boolean).join(" ");
};

export default renderProgressBar;
