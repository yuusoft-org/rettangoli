import { ansi } from "../tui/ansi.js";
import { resolveTerminalWidth, resolveWidth } from "./common.js";

const MIN_COLUMN_WIDTH = 4;

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

const normalizeColumns = ({ columns = [], rows = [] }) => {
  if (Array.isArray(columns) && columns.length > 0) {
    return columns.map((column, index) => ({
      key: String(column?.key || `col${index}`),
      label: String(column?.label || column?.key || `Col ${index + 1}`),
    }));
  }

  const firstRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!firstRow || typeof firstRow !== "object") {
    return [];
  }

  return Object.keys(firstRow).map((key) => ({
    key,
    label: key,
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

const computeColumnWidths = ({ columns, rows, maxWidth, maxColWidth }) => {
  const widths = columns.map((column) => column.label.length);

  rows.forEach((row) => {
    columns.forEach((column, index) => {
      const value = sanitizeText(getNestedValue(row, column.key));
      widths[index] = Math.max(widths[index], value.length);
    });
  });

  const clamped = widths.map((width) => {
    return Math.max(MIN_COLUMN_WIDTH, Math.min(width, maxColWidth));
  });

  const borderOverhead = columns.length + 1;
  let totalWidth = clamped.reduce((sum, width) => sum + width, 0) + borderOverhead;
  while (totalWidth > maxWidth) {
    let changed = false;

    for (let index = 0; index < clamped.length && totalWidth > maxWidth; index += 1) {
      if (clamped[index] > MIN_COLUMN_WIDTH) {
        clamped[index] -= 1;
        totalWidth -= 1;
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return clamped;
};

const drawRow = ({ columns, widths, row, separator = "│" }) => {
  const cells = columns.map((column, index) => {
    const value = sanitizeText(getNestedValue(row, column.key));
    return pad(truncate(value, widths[index]), widths[index]);
  });
  return `${separator}${cells.join(separator)}${separator}`;
};

const drawHeader = ({ columns, widths }) => {
  const cells = columns.map((column, index) => {
    return pad(truncate(column.label, widths[index]), widths[index]);
  });
  return `│${cells.join("│")}│`;
};

const drawDivider = ({ left, mid, right, widths }) => {
  const segments = widths.map((width) => "─".repeat(width));
  return `${left}${segments.join(mid)}${right}`;
};

const renderEmpty = ({ columns, widths }) => {
  const tableWidth = widths.reduce((sum, width) => sum + width, 0) + columns.length + 1;
  const emptyText = "(empty)";
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
  const widths = computeColumnWidths({
    columns,
    rows,
    maxWidth,
    maxColWidth,
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
  const body = rows.length > 0
    ? rows.map((row, rowIndex) => {
      const line = drawRow({ columns, widths, row });
      if (highlightRow && rowIndex === selectedIndex) {
        return ansi.bgCyan(ansi.fgBlack(line));
      }
      return styleStatusRow(line, row);
    })
    : [renderEmpty({ columns, widths })];
  const bottom = drawDivider({ left: "└", mid: "┴", right: "┘", widths });

  return [top, head, middle, ...body, bottom].join("\n");
};

export default renderTable;
