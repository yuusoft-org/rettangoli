import { ansi } from "../tui/ansi.js";
import { resolveTerminalWidth } from "./common.js";

const ANSI_SEQUENCE_REGEX = /\u001b\[[0-9;]*m/g;
const YES_VALUES = new Set(["", "1", "true", "yes", "on"]);
const GAP = "  ";
const EDGE_MARKER = ansi.dim("...");

const isTrue = (value) => {
  if (value === true || value === 1) {
    return true;
  }
  if (typeof value !== "string") {
    return false;
  }
  return YES_VALUES.has(value.trim().toLowerCase());
};

const stripAnsi = (value) => String(value || "").replace(ANSI_SEQUENCE_REGEX, "");
const visibleLength = (value) => stripAnsi(value).length;

const truncatePlainText = (value, width) => {
  const text = String(value || "");
  if (width <= 0) {
    return "";
  }
  if (text.length <= width) {
    return text;
  }
  if (width <= 3) {
    return text.slice(0, width);
  }
  return `${text.slice(0, width - 3)}...`;
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

const toItemId = (item, index) => {
  if (item && typeof item === "object") {
    return String(
      item.id
        ?? item.value
        ?? item.key
        ?? item.label
        ?? item.text
        ?? item.title
        ?? item.name
        ?? index,
    );
  }
  return String(item ?? index);
};

const toItemLabel = (item) => {
  if (item && typeof item === "object") {
    return String(
      item.label
        ?? item.text
        ?? item.title
        ?? item.name
        ?? item.value
        ?? item.id
        ?? "",
    );
  }
  return String(item ?? "");
};

const toShortLabel = (item, fallback) => {
  if (item && typeof item === "object") {
    const explicit = item.shortLabel ?? item.shortText ?? item.shortTitle;
    if (explicit !== undefined && explicit !== null && String(explicit).trim()) {
      return String(explicit);
    }
  }
  return String(fallback || "");
};

const normalizeVariant = (value) => {
  const token = String(value || "primary").trim().toLowerCase();
  return token === "secondary" ? "secondary" : "primary";
};

const renderTab = ({ label, selected, disabled, variant }) => {
  const safeLabel = String(label || "").trim() || "-";

  if (variant === "secondary") {
    if (selected) {
      return ansi.bold(`[${safeLabel}]`);
    }
    if (disabled) {
      return ansi.dim(`(${safeLabel})`);
    }
    return ansi.dim(safeLabel);
  }

  const chip = ` ${safeLabel} `;
  if (selected) {
    return ansi.bgGray(ansi.fgWhite(chip));
  }
  if (disabled) {
    return ansi.dim(chip);
  }
  return ansi.dim(safeLabel);
};

const joinSegments = (segments) => segments.filter(Boolean).join(GAP);

const computeWindowOutput = ({
  items,
  selectedIndex,
  variant,
  prefix,
  useShortLabels,
  width,
}) => {
  const prefixSegments = prefix ? [ansi.dim(String(prefix))] : [];
  const tabSegments = items.map((item, index) => {
    const label = useShortLabels ? item.shortLabel : item.label;
    return renderTab({
      label,
      selected: index === selectedIndex,
      disabled: item.disabled,
      variant,
    });
  });

  if (tabSegments.length === 0) {
    return joinSegments(prefixSegments);
  }

  const measure = (indices, moreLeft, moreRight) => {
    const segments = [...prefixSegments];
    if (moreLeft) {
      segments.push(EDGE_MARKER);
    }
    segments.push(...indices.map((index) => tabSegments[index]));
    if (moreRight) {
      segments.push(EDGE_MARKER);
    }
    return joinSegments(segments);
  };

  let indices = [selectedIndex];
  let left = selectedIndex - 1;
  let right = selectedIndex + 1;

  while (left >= 0 || right < tabSegments.length) {
    let added = false;

    if (left >= 0) {
      const candidate = [left, ...indices];
      const candidateOutput = measure(candidate, left - 1 >= 0, right < tabSegments.length);
      if (visibleLength(candidateOutput) <= width) {
        indices = candidate;
        left -= 1;
        added = true;
      }
    }

    if (right < tabSegments.length) {
      const candidate = [...indices, right];
      const candidateOutput = measure(candidate, left >= 0, right + 1 < tabSegments.length);
      if (visibleLength(candidateOutput) <= width) {
        indices = candidate;
        right += 1;
        added = true;
      }
    }

    if (!added) {
      break;
    }
  }

  const measuredOutput = measure(indices, left >= 0, right < tabSegments.length);
  if (visibleLength(measuredOutput) <= width) {
    return measuredOutput;
  }

  const prefixWidth = prefixSegments.length > 0
    ? visibleLength(joinSegments(prefixSegments)) + GAP.length
    : 0;
  const markerReserve = (left >= 0 ? visibleLength(EDGE_MARKER) + GAP.length : 0)
    + (right < tabSegments.length ? visibleLength(EDGE_MARKER) + GAP.length : 0);
  const labelWidth = Math.max(4, width - prefixWidth - markerReserve - 4);
  const selectedItem = items[selectedIndex];
  const truncatedLabel = truncatePlainText(
    useShortLabels ? selectedItem.shortLabel : selectedItem.label,
    labelWidth,
  );
  const selectedOnly = renderTab({
    label: truncatedLabel,
    selected: true,
    disabled: selectedItem.disabled,
    variant,
  });

  const fallbackSegments = [...prefixSegments];
  if (left >= 0) {
    fallbackSegments.push(EDGE_MARKER);
  }
  fallbackSegments.push(selectedOnly);
  if (right < tabSegments.length) {
    fallbackSegments.push(EDGE_MARKER);
  }
  return joinSegments(fallbackSegments);
};

const renderTabs = ({ attrs, props }) => {
  const items = normalizeItems(props.items ?? attrs.items).map((item, index) => {
    const label = toItemLabel(item);
    return {
      id: toItemId(item, index),
      label,
      shortLabel: toShortLabel(item, label),
      disabled: Boolean(item?.disabled),
    };
  });

  if (items.length === 0) {
    return "";
  }

  const hideIfSingle = isTrue(props.hideIfSingle ?? attrs.hideIfSingle);
  if (hideIfSingle && items.length <= 1) {
    return "";
  }

  const selectedTabRaw = props.selectedTab
    ?? attrs.selectedTab
    ?? props.selectedValue
    ?? attrs.selectedValue;
  const selectedIndexRaw = Number(props.selectedIndex ?? attrs.selectedIndex);
  const selectedById = items.findIndex((item) => item.id === String(selectedTabRaw ?? ""));
  const selectedIndex = selectedById >= 0
    ? selectedById
    : (Number.isInteger(selectedIndexRaw)
      ? Math.min(Math.max(selectedIndexRaw, 0), Math.max(0, items.length - 1))
      : 0);

  const prefix = String(props.prefix ?? attrs.prefix ?? "").trim();
  const variant = normalizeVariant(props.variant ?? attrs.variant);
  const width = resolveTerminalWidth(props.w ?? attrs.w, 72);

  const fullOutput = joinSegments([
    ...(prefix ? [ansi.dim(prefix)] : []),
    ...items.map((item, index) => renderTab({
      label: item.label,
      selected: index === selectedIndex,
      disabled: item.disabled,
      variant,
    })),
  ]);
  if (visibleLength(fullOutput) <= width) {
    return fullOutput;
  }

  const shortOutput = joinSegments([
    ...(prefix ? [ansi.dim(prefix)] : []),
    ...items.map((item, index) => renderTab({
      label: item.shortLabel,
      selected: index === selectedIndex,
      disabled: item.disabled,
      variant,
    })),
  ]);
  if (visibleLength(shortOutput) <= width) {
    return shortOutput;
  }

  return computeWindowOutput({
    items,
    selectedIndex,
    variant,
    prefix,
    useShortLabels: true,
    width,
  });
};

export default renderTabs;
