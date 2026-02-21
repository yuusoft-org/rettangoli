import { normalizeLines, resolveSpacing } from "./common.js";

const ANSI_SEQUENCE_REGEX = /\u001b\[[0-9;]*m/g;

const stripAnsi = (value) => String(value || "").replace(ANSI_SEQUENCE_REGEX, "");

const visibleWidth = (value) => stripAnsi(value).length;

const padToVisibleWidth = (value, width) => {
  const line = String(value || "");
  const currentWidth = visibleWidth(line);
  if (currentWidth >= width) {
    return line;
  }
  return `${line}${" ".repeat(width - currentWidth)}`;
};

const renderHorizontal = ({ childValues, gap }) => {
  if (childValues.length === 0) {
    return "";
  }

  const blocks = childValues.map((value) => String(value ?? "").split("\n"));
  const maxLines = Math.max(...blocks.map((block) => block.length), 0);
  const blockWidths = blocks.map((block) => {
    return block.reduce((maxWidth, line) => Math.max(maxWidth, visibleWidth(line)), 0);
  });

  const joinedLines = [];

  for (let lineIndex = 0; lineIndex < maxLines; lineIndex += 1) {
    const segments = blocks.map((block, blockIndex) => {
      const line = block[lineIndex] || "";
      return padToVisibleWidth(line, blockWidths[blockIndex]);
    });

    joinedLines.push(segments.join(" ".repeat(gap)).trimEnd());
  }

  return joinedLines.join("\n").trimEnd();
};

const renderView = ({ attrs, props, renderChildren }) => {
  const flow = attrs.d || props.d || "v";
  const gap = resolveSpacing(attrs.g || props.g);
  const childValues = renderChildren();
  if (flow === "h") {
    return renderHorizontal({ childValues, gap });
  }

  const childLines = normalizeLines(childValues);
  return childLines.join("\n");
};

export default renderView;
