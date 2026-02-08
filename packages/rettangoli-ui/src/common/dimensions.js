const FLEX_GROW_DIMENSION_REGEX = /^([1-9]|1[0-2])fg$/;

export const isFlexGrowDimension = (dimension) => {
  return typeof dimension === "string" && FLEX_GROW_DIMENSION_REGEX.test(dimension);
};

export const applyDimensionToStyleBucket = ({
  styleBucket,
  axis,
  dimension,
  fillValue,
  allowFlexGrow = false,
  lockBounds = true,
}) => {
  if (dimension === undefined) {
    return;
  }

  if (dimension === "f") {
    styleBucket[axis] = fillValue;
    return;
  }

  if (allowFlexGrow && isFlexGrowDimension(dimension)) {
    styleBucket["flex-grow"] = dimension.slice(0, -2);
    styleBucket["flex-basis"] = "0%";
    return;
  }

  styleBucket[axis] = dimension;
  if (lockBounds) {
    styleBucket[`min-${axis}`] = dimension;
    styleBucket[`max-${axis}`] = dimension;
  }
};

export const applyInlineWidthDimension = ({
  style,
  width,
  fillValue = "var(--width-stretch)",
  allowFlexGrow = true,
  flexMinWidth = "0",
}) => {
  if (width === "f") {
    style.width = fillValue;
    style.flexGrow = "";
    style.flexBasis = "";
    style.minWidth = "";
    return;
  }

  if (allowFlexGrow && isFlexGrowDimension(width)) {
    style.width = "";
    style.flexGrow = width.slice(0, -2);
    style.flexBasis = "0%";
    style.minWidth = flexMinWidth;
    return;
  }

  if (width != null) {
    style.width = width;
    style.flexGrow = "";
    style.flexBasis = "";
    style.minWidth = "";
    return;
  }

  style.width = "";
  style.flexGrow = "";
  style.flexBasis = "";
  style.minWidth = "";
};
