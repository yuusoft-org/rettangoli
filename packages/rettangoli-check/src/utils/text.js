// Offset helpers for source text. Lines and columns are 1-based.

export const createLineOffsets = (source = "") => {
  const offsets = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") {
      offsets.push(index + 1);
    }
  }
  return offsets;
};

export const offsetToLineColumn = ({ lineOffsets = [], offset = 0 }) => {
  if (!Array.isArray(lineOffsets) || lineOffsets.length === 0) {
    return {};
  }

  const safeOffset = Math.max(0, Number.isInteger(offset) ? offset : 0);
  let low = 0;
  let high = lineOffsets.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const start = lineOffsets[mid];
    const next = lineOffsets[mid + 1] ?? Number.POSITIVE_INFINITY;

    if (safeOffset >= start && safeOffset < next) {
      return {
        line: mid + 1,
        column: safeOffset - start + 1,
      };
    }

    if (safeOffset < start) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  const lastLineIndex = lineOffsets.length - 1;
  const lastStart = lineOffsets[lastLineIndex] ?? 0;
  return {
    line: lastLineIndex + 1,
    column: Math.max(1, safeOffset - lastStart + 1),
  };
};
