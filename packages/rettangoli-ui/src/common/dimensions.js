const FLEX_GROW_DIMENSION_REGEX = /^([1-9]|1[0-2])fg$/;
const FLEX_BASIS_DIMENSION_REGEX = /^([1-9]\d*)\/([1-9]\d*)fb$/;

export const isFlexGrowDimension = (dimension) => {
  return typeof dimension === "string" && FLEX_GROW_DIMENSION_REGEX.test(dimension);
};

export const parseFlexBasisDimension = (dimension) => {
  if (typeof dimension !== "string") {
    return null;
  }

  const match = dimension.match(FLEX_BASIS_DIMENSION_REGEX);
  if (!match) {
    return null;
  }

  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator <= 0 || numerator > denominator) {
    return null;
  }

  return { numerator, denominator };
};

export const isFlexBasisDimension = (dimension) => {
  return parseFlexBasisDimension(dimension) !== null;
};

function toFlexBasisCss({ numerator, denominator, gapVar }) {
  if (numerator === denominator) {
    return "100%";
  }

  if (numerator === 1) {
    return `calc((100% - ((${denominator} - 1) * ${gapVar})) / ${denominator})`;
  }

  return `calc(((100% - ((${denominator} - 1) * ${gapVar})) * ${numerator}) / ${denominator})`;
}

export const applyDimensionToStyleBucket = ({
  styleBucket,
  axis,
  dimension,
  fillValue,
  allowFlexGrow = false,
  flexMinDimension = "0",
  lockBounds = true,
}) => {
  const resetWidthFlexBasisState = () => {
    if (!allowFlexGrow || axis !== "width") {
      return;
    }
    styleBucket["flex-grow"] = "0";
    styleBucket["flex-shrink"] = "1";
    styleBucket["flex-basis"] = "auto";
  };

  const clearAxisBounds = () => {
    styleBucket[`min-${axis}`] = "unset";
    styleBucket[`max-${axis}`] = "unset";
  };

  if (dimension === undefined) {
    return;
  }

  if (dimension === "f") {
    resetWidthFlexBasisState();
    styleBucket[axis] = fillValue;
    clearAxisBounds();
    return;
  }

  if (allowFlexGrow && isFlexGrowDimension(dimension)) {
    styleBucket["flex-grow"] = dimension.slice(0, -2);
    styleBucket["flex-basis"] = "0%";
    styleBucket[`min-${axis}`] = flexMinDimension;
    styleBucket[`max-${axis}`] = "unset";
    return;
  }

  const flexBasis = allowFlexGrow ? parseFlexBasisDimension(dimension) : null;
  if (flexBasis) {
    styleBucket["flex-grow"] = "0";
    styleBucket["flex-shrink"] = "0";
    styleBucket["flex-basis"] = toFlexBasisCss({
      ...flexBasis,
      gapVar: "var(--rtgl-flex-gap, 0px)",
    });
    styleBucket[`min-${axis}`] = flexMinDimension;
    styleBucket[`max-${axis}`] = "unset";
    return;
  }

  resetWidthFlexBasisState();
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
    style.flexShrink = "";
    style.flexBasis = "0%";
    style.minWidth = flexMinWidth;
    return;
  }

  const inlineFlexBasis = allowFlexGrow ? parseFlexBasisDimension(width) : null;
  if (inlineFlexBasis) {
    style.width = "";
    style.flexGrow = "0";
    style.flexShrink = "0";
    style.flexBasis = toFlexBasisCss({
      ...inlineFlexBasis,
      gapVar: "var(--rtgl-flex-gap, 0px)",
    });
    style.minWidth = flexMinWidth;
    return;
  }

  if (width != null) {
    style.width = width;
    style.flexGrow = "";
    style.flexShrink = "";
    style.flexBasis = "";
    style.minWidth = "";
    return;
  }

  style.width = "";
  style.flexGrow = "";
  style.flexShrink = "";
  style.flexBasis = "";
  style.minWidth = "";
};
