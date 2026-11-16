/**
 * Reading direction of an element, from its computed style. This follows the
 * nearest `dir` attribute, including one set on an ancestor outside a shadow
 * root.
 */
export const getDirection = (element) => {
  if (element && typeof getComputedStyle === "function") {
    return getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";
  }

  return "ltr";
};

export const isRtl = (element) => getDirection(element) === "rtl";

/**
 * Arrow keys that move to the next and previous item of a horizontal row.
 * The next item sits to the left under RTL.
 */
export const getInlineArrowKeys = (element) => (
  isRtl(element)
    ? { next: "ArrowLeft", previous: "ArrowRight" }
    : { next: "ArrowRight", previous: "ArrowLeft" }
);

/**
 * The x coordinate of the inline-start or inline-end edge of a rect: its
 * left or right edge under LTR, swapped under RTL.
 */
export const getInlineEdge = (rect, edge, element) => {
  const startIsLeft = !isRtl(element);
  return (edge === "start") === startIsLeft ? rect.left : rect.right;
};
