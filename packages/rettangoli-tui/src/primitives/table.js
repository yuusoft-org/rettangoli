import { ansi } from "../tui/ansi.js";
import { resolveTerminalWidth, resolveWidth } from "./common.js";

const MIN_COLUMN_WIDTH = 4;
const DEFAULT_PLAIN_SEPARATOR = " | ";
const YES_VALUES = new Set(["", "1", "true", "yes", "on"]);

const getNestedValue = (object, path) => {
  if (!path || typeof path !== "string") {
    return undefined;
  }

  return path.split(".").reduce((current, key) => {
    if (current === undefined || current === null) {
      return undefined;
    }
    return current[key];
  }, object);
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

const normalizeAlign = (value, fallback = "left") => {
  const token = String(value || "").trim().toLowerCase();
  if (token === "left" || token === "l") {
    return "left";
  }
  if (token === "right" || token === "r") {
    return "right";
  }
  if (token === "center" || token === "c" || token === "middle") {
    return "center";
  }
  return fallback;
};

const normalizeTruncateMode = (value) => {
  const token = String(value || "").trim().toLowerCase();
  if (token === "clip" || token === "cut") {
    return "clip";
  }
  return "ellipsis";
};

const parseWidthSpec = (value) => {
  if (value === undefined || value === null || value === "") {
    return { type: "auto", value: 0 };
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return { type: "fixed", value: Math.floor(value) };
  }

  const token = String(value).trim().toLowerCase();
  if (!token) {
    return { type: "auto", value: 0 };
  }

  if (token === "*" || token === "auto" || token === "flex") {
    return { type: "flex", value: 1 };
  }

  const weightedStarMatch = token.match(/^(\d+(?:\.\d+)?)\*$/);
  if (weightedStarMatch) {
    const numeric = Number(weightedStarMatch[1]);
    return {
      type: "flex",
      value: Number.isFinite(numeric) && numeric > 0 ? numeric : 1,
    };
  }

  const percentMatch = token.match(/^(\d+(?:\.\d+)?)%$/);
  if (percentMatch) {
    const numeric = Number(percentMatch[1]);
    if (Number.isFinite(numeric)) {
      return {
        type: "percent",
        value: Math.max(0, Math.min(100, numeric)),
      };
    }
  }

  const numeric = Number(token);
  if (Number.isFinite(numeric)) {
    return { type: "fixed", value: Math.floor(numeric) };
  }

  return { type: "auto", value: 0 };
};

const normalizeColumns = ({ columns = [], rows = [] }) => {
  if (Array.isArray(columns) && columns.length > 0) {
    return columns.map((column, index) => {
      const align = normalizeAlign(column?.align, "left");
      return {
        key: String(column?.key || `col${index}`),
        label: String(
          column?.header
            || column?.label
            || column?.title
            || column?.key
            || `Col ${index + 1}`,
        ),
        width: parseWidthSpec(column?.width ?? column?.w),
        align,
        headerAlign: normalizeAlign(column?.headerAlign, align),
        truncate: normalizeTruncateMode(column?.truncate),
      };
    });
  }

  const firstRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!firstRow || typeof firstRow !== "object") {
    return [];
  }

  return Object.keys(firstRow).map((key) => ({
    key,
    label: key,
    width: { type: "auto", value: 0 },
    align: "left",
    headerAlign: "left",
    truncate: "ellipsis",
  }));
};

const normalizeRows = (rows) => {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows;
};

const sanitizeText = (value) => {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).replace(/\s*\n+\s*/g, " ").trim();
};

const truncate = (text, width) => {
  if (text.length <= width) {
    return text;
  }
  if (width <= 1) {
    return text.slice(0, width);
  }
  return `${text.slice(0, width - 1)}…`;
};

const pad = (text, width) => {
  if (text.length >= width) {
    return text;
  }
  return `${text}${" ".repeat(width - text.length)}`;
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const computeIntrinsicWidths = ({ columns, rows, maxColWidth }) => {
  const widths = columns.map((column) => sanitizeText(column.label).length);

  rows.forEach((row) => {
    columns.forEach((column, index) => {
      const value = sanitizeText(getNestedValue(row, column.key));
      widths[index] = Math.max(widths[index], value.length);
    });
  });

  return widths.map((width) => {
    return Math.max(MIN_COLUMN_WIDTH, Math.min(width, maxColWidth));
  });
};

const resolveColumnPriority = (column) => {
  const specType = column?.width?.type || "auto";
  if (specType === "fixed") return 4;
  if (specType === "percent") return 3;
  if (specType === "auto") return 2;
  if (specType === "flex") return 1;
  return 2;
};

const distributeByWeight = (widths, indexes, extra, columns) => {
  if (extra <= 0 || indexes.length === 0) {
    return;
  }

  const weights = indexes.map((index) => {
    const value = Number(columns[index]?.width?.value);
    return Number.isFinite(value) && value > 0 ? value : 1;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  let remaining = extra;
  indexes.forEach((index, offset) => {
    if (remaining <= 0) return;
    const share = Math.floor((extra * weights[offset]) / totalWeight);
    if (share > 0) {
      widths[index] += share;
      remaining -= share;
    }
  });

  let pointer = 0;
  while (remaining > 0) {
    const index = indexes[pointer % indexes.length];
    widths[index] += 1;
    remaining -= 1;
    pointer += 1;
  }
};

const resolveColumnWidths = ({
  columns,
  intrinsicWidths,
  maxWidth,
  borderOverhead,
}) => {
  const contentMaxWidth = Math.max(1, maxWidth - borderOverhead);
  const widths = columns.map((_, index) => Math.max(MIN_COLUMN_WIDTH, intrinsicWidths[index]));

  columns.forEach((column, index) => {
    const spec = column.width || { type: "auto", value: 0 };
    if (spec.type === "fixed") {
      widths[index] = Math.max(MIN_COLUMN_WIDTH, spec.value || MIN_COLUMN_WIDTH);
      return;
    }
    if (spec.type === "percent") {
      widths[index] = Math.max(
        MIN_COLUMN_WIDTH,
        Math.floor((contentMaxWidth * (spec.value || 0)) / 100),
      );
    }
  });

  let totalContentWidth = widths.reduce((sum, width) => sum + width, 0);
  if (totalContentWidth < contentMaxWidth) {
    const flexIndexes = [];
    columns.forEach((column, index) => {
      if ((column?.width?.type || "auto") === "flex") {
        flexIndexes.push(index);
      }
    });

    const autoIndexes = [];
    columns.forEach((column, index) => {
      if ((column?.width?.type || "auto") === "auto") {
        autoIndexes.push(index);
      }
    });

    const extra = contentMaxWidth - totalContentWidth;
    if (flexIndexes.length > 0) {
      distributeByWeight(widths, flexIndexes, extra, columns);
    } else if (autoIndexes.length > 0) {
      distributeByWeight(widths, autoIndexes, extra, columns);
    }
  }

  totalContentWidth = widths.reduce((sum, width) => sum + width, 0);
  while (totalContentWidth > contentMaxWidth) {
    let changed = false;
    const shrinkOrder = columns
      .map((column, index) => ({ index, priority: resolveColumnPriority(column) }))
      .sort((left, right) => left.priority - right.priority)
      .map((entry) => entry.index);

    for (let pointer = 0; pointer < shrinkOrder.length && totalContentWidth > contentMaxWidth; pointer += 1) {
      const index = shrinkOrder[pointer];
      if (widths[index] > MIN_COLUMN_WIDTH) {
        widths[index] -= 1;
        totalContentWidth -= 1;
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return widths;
};

const truncateWithMode = (text, width, mode = "ellipsis") => {
  if (text.length <= width) {
    return text;
  }
  if (width <= 0) {
    return "";
  }
  if (mode === "clip" || width <= 1) {
    return text.slice(0, width);
  }
  return `${text.slice(0, width - 1)}…`;
};

const alignCell = (text, width, align = "left") => {
  if (text.length >= width) {
    return text;
  }

  const spaceCount = width - text.length;
  if (align === "right") {
    return `${" ".repeat(spaceCount)}${text}`;
  }
  if (align === "center") {
    const left = Math.floor(spaceCount / 2);
    const right = spaceCount - left;
    return `${" ".repeat(left)}${text}${" ".repeat(right)}`;
  }
  return `${text}${" ".repeat(spaceCount)}`;
};

const drawRow = ({ columns, widths, row, separator = "│", edges = true }) => {
  const cells = columns.map((column, index) => {
    const value = sanitizeText(getNestedValue(row, column.key));
    const text = truncateWithMode(value, widths[index], column.truncate);
    return alignCell(text, widths[index], column.align);
  });

  if (!edges) {
    return cells.join(separator);
  }
  return `${separator}${cells.join(separator)}${separator}`;
};

const drawHeader = ({ columns, widths, separator = "│", edges = true }) => {
  const cells = columns.map((column, index) => {
    const headerText = sanitizeText(column.label);
    const text = truncateWithMode(headerText, widths[index], column.truncate);
    return alignCell(text, widths[index], column.headerAlign);
  });

  if (!edges) {
    return cells.join(separator);
  }
  return `│${cells.join("│")}│`;
};

const drawDivider = ({ left, mid, right, widths }) => {
  const segments = widths.map((width) => "─".repeat(width));
  return `${left}${segments.join(mid)}${right}`;
};

const drawPlainDivider = ({ widths, separator }) => {
  const segments = widths.map((width) => "─".repeat(width));
  return segments.join(separator);
};

const renderEmpty = ({ columns, widths, separator = "│", edges = true }) => {
  const tableWidth = widths.reduce((sum, width) => sum + width, 0)
    + (edges ? columns.length + 1 : (columns.length - 1) * separator.length);
  const emptyText = "(empty)";
  if (!edges) {
    return truncate(emptyText, Math.max(1, tableWidth));
  }

  const innerWidth = Math.max(0, tableWidth - 2);
  const cell = pad(truncate(emptyText, innerWidth), innerWidth);
  return `│${cell}│`;
};

const styleStatusRow = (line, row = {}) => {
  const status = String(row?.status || "").toLowerCase();
  if (status === "done") {
    return ansi.fgGreen(line);
  }
  if (status === "doing" || status === "in-progress") {
    return ansi.fgCyan(line);
  }
  if (status === "todo") {
    return ansi.fgYellow(line);
  }
  return line;
};

const renderTable = ({ attrs, props }) => {
  const data = props.data || attrs.data || {};
  const rows = normalizeRows(data.rows);
  const columns = normalizeColumns({
    columns: Array.isArray(data.columns) ? data.columns : [],
    rows,
  });

  if (columns.length === 0) {
    return ansi.dim("(empty)");
  }

  const maxWidth = Math.max(20, resolveTerminalWidth(props.w || attrs.w, 72));
  const maxColWidth = Math.max(8, resolveWidth(props.cw || attrs.cw, 24));
  const variantToken = String(props.variant || attrs.variant || data.variant || "boxed").toLowerCase();
  const variant = variantToken === "plain" ? "plain" : "boxed";
  const plainSeparator = String(
    props.separator
      || attrs.separator
      || props.sep
      || attrs.sep
      || data.separator
      || DEFAULT_PLAIN_SEPARATOR,
  );
  const showHeader = isTrue(props.showHeader ?? attrs.showHeader ?? data.showHeader ?? true);
  const borderOverhead = variant === "boxed"
    ? columns.length + 1
    : Math.max(0, (columns.length - 1) * plainSeparator.length);
  const intrinsicWidths = computeIntrinsicWidths({
    columns,
    rows,
    maxColWidth,
  });
  const widths = resolveColumnWidths({
    columns,
    intrinsicWidths,
    maxWidth,
    borderOverhead,
  });

  const selectedIndex = clamp(
    Number(props.selectedIndex ?? attrs.selectedIndex) || 0,
    0,
    Math.max(0, rows.length - 1),
  );
  const highlightRow = String(props.highlight ?? attrs.highlight ?? "true").toLowerCase() !== "false";

  const top = drawDivider({ left: "┌", mid: "┬", right: "┐", widths });
  const head = ansi.bold(drawHeader({ columns, widths }));
  const middle = drawDivider({ left: "├", mid: "┼", right: "┤", widths });
  const plainHead = ansi.bold(drawHeader({
    columns,
    widths,
    separator: plainSeparator,
    edges: false,
  }));
  const plainDivider = drawPlainDivider({ widths, separator: plainSeparator });
  const body = rows.length > 0
    ? rows.map((row, rowIndex) => {
      const line = variant === "boxed"
        ? drawRow({ columns, widths, row })
        : drawRow({ columns, widths, row, separator: plainSeparator, edges: false });

      if (highlightRow && rowIndex === selectedIndex) {
        return ansi.bgCyan(ansi.fgBlack(line));
      }
      return styleStatusRow(line, row);
    })
    : [renderEmpty({
      columns,
      widths,
      separator: plainSeparator,
      edges: variant === "boxed",
    })];
  const bottom = drawDivider({ left: "└", mid: "┴", right: "┘", widths });

  if (variant === "plain") {
    const lines = [];
    if (showHeader) {
      lines.push(plainHead);
      lines.push(plainDivider);
    }
    lines.push(...body);
    return lines.join("\n");
  }

  const lines = [top];
  if (showHeader) {
    lines.push(head, middle);
  }
  lines.push(...body, bottom);
  return lines.join("\n");
};

export default renderTable;
