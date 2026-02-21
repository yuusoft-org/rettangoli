import { ansi } from "../tui/ansi.js";
import { resolveTerminalWidth } from "./common.js";

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

const normalizeItems = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null || value === "") {
    return [];
  }
  return [value];
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const truncate = (value, width) => {
  const text = String(value ?? "");
  if (text.length <= width) {
    return text;
  }
  if (width <= 1) {
    return text.slice(0, width);
  }
  return `${text.slice(0, width - 1)}…`;
};

const resolveItemText = (item) => {
  if (item === undefined || item === null) {
    return "";
  }
  if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
    return String(item);
  }

  if (typeof item === "object") {
    if (item.text !== undefined) {
      return String(item.text);
    }
    if (item.label !== undefined) {
      return String(item.label);
    }
    if (item.title !== undefined) {
      return String(item.title);
    }
    if (item.name !== undefined) {
      return String(item.name);
    }
  }

  return String(item);
};

const resolveCheckboxPrefix = (item) => {
  if (!item || typeof item !== "object") {
    return "";
  }

  if (item.done === true || item.completed === true || item.checked === true) {
    return "[x] ";
  }
  if (item.done === false || item.completed === false || item.checked === false) {
    return "[ ] ";
  }
  return "";
};

const resolveStatusColor = (item) => {
  const status = String(item?.status || "").toLowerCase();
  if (status === "done") {
    return ansi.fgGreen;
  }
  if (status === "doing" || status === "in-progress") {
    return ansi.fgCyan;
  }
  if (status === "todo") {
    return ansi.fgYellow;
  }
  return (value) => value;
};

const renderList = ({ attrs, props }) => {
  const items = normalizeItems(props.items ?? attrs.items);
  if (items.length === 0) {
    return ansi.dim("(empty)");
  }

  const marker = String(props.marker || attrs.marker || "•");
  const numbered = isTrue(props.n ?? attrs.n ?? props.numbered ?? attrs.numbered);
  const maxWidth = resolveTerminalWidth(props.w || attrs.w, 72);
  const selectedIndex = clamp(
    Number(props.selectedIndex ?? attrs.selectedIndex) || 0,
    0,
    Math.max(0, items.length - 1),
  );
  const active = isTrue(props.active ?? attrs.active ?? true);

  const lines = items.map((item, index) => {
    const checkboxPrefix = resolveCheckboxPrefix(item);
    const listPrefix = numbered ? `${index + 1}. ` : `${marker} `;
    const statusText = item?.status ? ` [${item.status}]` : "";
    const text = resolveItemText(item).replace(/\s*\n+\s*/g, " ");
    const content = truncate(
      `${checkboxPrefix}${text}${statusText}`.trim(),
      Math.max(4, maxWidth - listPrefix.length),
    );
    const line = `${listPrefix}${content}`;
    if (active && index === selectedIndex) {
      return ansi.bgCyan(ansi.fgBlack(line));
    }

    return resolveStatusColor(item)(line);
  });

  return lines.join("\n");
};

export default renderList;
