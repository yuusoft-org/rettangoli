import { dimensionWithUnit } from "../common.js";
import { parseFlexBasisDimension } from "./dimensions.js";

const toCarouselFlexBasisCss = ({ numerator, denominator, gapVar }) => {
  if (numerator === denominator) {
    return "100%";
  }

  if (numerator === 1) {
    return `calc((100% - ((${denominator} - 1) * ${gapVar})) / ${denominator})`;
  }

  return `calc(((100% - ((${denominator} - 1) * ${gapVar})) * ${numerator}) / ${denominator})`;
};

export const clampCarouselIndex = ({ index, maxIndex }) => {
  if (!Number.isFinite(index)) {
    return 0;
  }

  if (!Number.isFinite(maxIndex) || maxIndex < 0) {
    return 0;
  }

  return Math.min(Math.max(Math.trunc(index), 0), maxIndex);
};

export const resolveCarouselBooleanAttribute = ({
  value,
  defaultValue = false,
}) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  const normalizedValue = `${value}`.trim().toLowerCase();
  if (normalizedValue.length === 0) {
    return true;
  }

  if (
    normalizedValue === "false" ||
    normalizedValue === "0" ||
    normalizedValue === "no" ||
    normalizedValue === "off" ||
    normalizedValue === "none"
  ) {
    return false;
  }

  return true;
};

export const resolveCarouselSnapType = (snap) => {
  if (snap === undefined || snap === null) {
    return "x mandatory";
  }

  const normalizedSnap = `${snap}`.trim().toLowerCase();
  if (
    normalizedSnap === "" ||
    normalizedSnap === "true" ||
    normalizedSnap === "1" ||
    normalizedSnap === "yes"
  ) {
    return "x mandatory";
  }

  if (
    normalizedSnap === "false" ||
    normalizedSnap === "0" ||
    normalizedSnap === "no" ||
    normalizedSnap === "off" ||
    normalizedSnap === "none"
  ) {
    return "none";
  }

  return "x mandatory";
};

export const resolveCarouselScrollLeft = ({
  slideLeft,
  slideWidth,
  viewportWidth,
  scrollPaddingInlineStart = 0,
  scrollPaddingInlineEnd = 0,
  snapAlign = "center",
  maxScrollLeft = Number.POSITIVE_INFINITY,
}) => {
  if (
    !Number.isFinite(slideLeft) ||
    !Number.isFinite(slideWidth) ||
    !Number.isFinite(viewportWidth)
  ) {
    return 0;
  }

  const snapportStart = scrollPaddingInlineStart;
  const snapportEnd = viewportWidth - scrollPaddingInlineEnd;
  const snapportWidth = Math.max(snapportEnd - snapportStart, 0);

  let targetScrollLeft;
  if (snapAlign === "start") {
    targetScrollLeft = slideLeft - snapportStart;
  } else if (snapAlign === "end") {
    targetScrollLeft = (slideLeft + slideWidth) - snapportEnd;
  } else {
    targetScrollLeft =
      (slideLeft + (slideWidth / 2)) -
      (snapportStart + (snapportWidth / 2));
  }

  const normalizedMaxScrollLeft = Number.isFinite(maxScrollLeft)
    ? Math.max(maxScrollLeft, 0)
    : Number.POSITIVE_INFINITY;

  return Math.min(Math.max(targetScrollLeft, 0), normalizedMaxScrollLeft);
};

export const resolveCarouselViewportPaddingCss = ({
  slideWidthCss,
  snapAlign = "center",
}) => {
  const normalizedSnapAlign = `${snapAlign ?? ""}`.trim().toLowerCase();
  if (normalizedSnapAlign !== "center") {
    return "0px";
  }

  const normalizedSlideWidthCss =
    slideWidthCss && `${slideWidthCss}`.trim().length > 0
      ? `${slideWidthCss}`.trim()
      : "100%";

  return `max(calc((100% - (${normalizedSlideWidthCss})) / 2), 0px)`;
};

export const resolveCarouselSlideWidthCss = ({
  slideWidth,
  gapVar = "var(--rtgl-carousel-gap, 0px)",
}) => {
  if (slideWidth == null || `${slideWidth}`.trim() === "" || slideWidth === "f") {
    return "100%";
  }

  const flexBasis = parseFlexBasisDimension(`${slideWidth}`.trim());
  if (flexBasis) {
    return toCarouselFlexBasisCss({
      ...flexBasis,
      gapVar,
    });
  }

  return dimensionWithUnit(`${slideWidth}`.trim()) ?? "100%";
};
