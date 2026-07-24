const finiteOr = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const nonNegative = (value, fallback = 0) => {
  return Math.max(0, finiteOr(value, fallback));
};

const normalizeRect = (rect = {}) => {
  const rawLeft = finiteOr(rect.left, finiteOr(rect.x));
  const rawTop = finiteOr(rect.top, finiteOr(rect.y));
  const rawRight = finiteOr(
    rect.right,
    rawLeft + nonNegative(rect.width),
  );
  const rawBottom = finiteOr(
    rect.bottom,
    rawTop + nonNegative(rect.height),
  );

  return {
    left: Math.min(rawLeft, rawRight),
    right: Math.max(rawLeft, rawRight),
    top: Math.min(rawTop, rawBottom),
    bottom: Math.max(rawTop, rawBottom),
  };
};

const effectivePadding = (padding, viewportSize) => {
  return Math.min(nonNegative(padding), nonNegative(viewportSize) / 2);
};

const fitsWithin = ({ start, size, viewportSize, padding }) => {
  return start >= padding && start + size <= viewportSize - padding;
};

const overflowAmount = ({ start, size, viewportSize, padding }) => {
  return (
    Math.max(0, padding - start)
    + Math.max(0, start + size - (viewportSize - padding))
  );
};

const clampToViewport = ({ start, size, viewportSize, padding }) => {
  const minimum = padding;
  const maximum = viewportSize - padding - size;

  // When the panel is larger than the padded viewport there is no position
  // that can contain it. Pin its start edge to the safe padding instead of
  // producing a negative coordinate or reversing the clamp bounds.
  if (maximum < minimum) {
    return minimum;
  }

  return Math.max(minimum, Math.min(start, maximum));
};

/**
 * Calculates an absolute viewport position for a submenu panel.
 *
 * The logical inline-end side is preferred (right in LTR, left in RTL). When
 * that side overflows and the opposite side fits, the panel flips. If neither
 * side fits, the side with the least horizontal overflow wins and the final
 * coordinates are clamped to the padded viewport.
 */
export const calculateSubmenuPosition = ({
  anchorRect = {},
  panelWidth = 0,
  panelHeight = 0,
  viewportWidth = 0,
  viewportHeight = 0,
  direction = "ltr",
  gap = 0,
  padding = 8,
} = {}) => {
  const anchor = normalizeRect(anchorRect);
  const width = nonNegative(panelWidth);
  const height = nonNegative(panelHeight);
  const viewportW = nonNegative(viewportWidth);
  const viewportH = nonNegative(viewportHeight);
  const panelGap = nonNegative(gap);
  const horizontalPadding = effectivePadding(padding, viewportW);
  const verticalPadding = effectivePadding(padding, viewportH);
  const preferredSide = String(direction).toLowerCase() === "rtl"
    ? "left"
    : "right";
  const oppositeSide = preferredSide === "right" ? "left" : "right";
  const candidateBySide = {
    right: anchor.right + panelGap,
    left: anchor.left - panelGap - width,
  };
  const fitsBySide = {
    right: fitsWithin({
      start: candidateBySide.right,
      size: width,
      viewportSize: viewportW,
      padding: horizontalPadding,
    }),
    left: fitsWithin({
      start: candidateBySide.left,
      size: width,
      viewportSize: viewportW,
      padding: horizontalPadding,
    }),
  };

  let side = preferredSide;
  if (!fitsBySide[preferredSide]) {
    if (fitsBySide[oppositeSide]) {
      side = oppositeSide;
    } else {
      const preferredOverflow = overflowAmount({
        start: candidateBySide[preferredSide],
        size: width,
        viewportSize: viewportW,
        padding: horizontalPadding,
      });
      const oppositeOverflow = overflowAmount({
        start: candidateBySide[oppositeSide],
        size: width,
        viewportSize: viewportW,
        padding: horizontalPadding,
      });

      if (oppositeOverflow < preferredOverflow) {
        side = oppositeSide;
      }
    }
  }

  return {
    left: clampToViewport({
      start: candidateBySide[side],
      size: width,
      viewportSize: viewportW,
      padding: horizontalPadding,
    }),
    top: clampToViewport({
      start: anchor.top,
      size: height,
      viewportSize: viewportH,
      padding: verticalPadding,
    }),
    side,
    flipped: side !== preferredSide,
  };
};

/**
 * Creates the triangular pointer-grace corridor between a menu-item exit
 * point and the near edge of its child panel.
 *
 * `side` is the physical side occupied by the child panel. A positive buffer
 * expands the panel edge vertically to tolerate small diagonal movements.
 */
export const createSubmenuGracePolygon = ({
  exitPoint = {},
  panelRect = {},
  side = "right",
  buffer = 0,
} = {}) => {
  const panel = normalizeRect(panelRect);
  const exit = {
    x: finiteOr(exitPoint.x),
    y: finiteOr(exitPoint.y),
  };
  const edgeX = side === "left" ? panel.right : panel.left;
  const edgeBuffer = nonNegative(buffer);

  return [
    exit,
    {
      x: edgeX,
      y: panel.top - edgeBuffer,
    },
    {
      x: edgeX,
      y: panel.bottom + edgeBuffer,
    },
  ];
};

const isPointOnSegment = (point, start, end) => {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const pointDeltaX = point.x - start.x;
  const pointDeltaY = point.y - start.y;
  const crossProduct = pointDeltaX * deltaY - pointDeltaY * deltaX;
  const scale = Math.max(
    1,
    Math.abs(deltaX),
    Math.abs(deltaY),
    Math.abs(pointDeltaX),
    Math.abs(pointDeltaY),
  );

  if (Math.abs(crossProduct) > Number.EPSILON * scale * scale * 8) {
    return false;
  }

  return (
    point.x >= Math.min(start.x, end.x)
    && point.x <= Math.max(start.x, end.x)
    && point.y >= Math.min(start.y, end.y)
    && point.y <= Math.max(start.y, end.y)
  );
};

/**
 * Returns whether a point is inside a polygon. Points on an edge or vertex are
 * considered inside so pointer movement along the grace corridor boundary
 * does not close a submenu.
 */
export const isPointInPolygon = (point = {}, polygon = []) => {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }

  const normalizedPoint = {
    x: Number(point.x),
    y: Number(point.y),
  };
  const normalizedPolygon = polygon.map((vertex) => ({
    x: Number(vertex?.x),
    y: Number(vertex?.y),
  }));

  if (
    !Number.isFinite(normalizedPoint.x)
    || !Number.isFinite(normalizedPoint.y)
    || normalizedPolygon.some(
      (vertex) => !Number.isFinite(vertex.x) || !Number.isFinite(vertex.y),
    )
  ) {
    return false;
  }

  let inside = false;

  for (
    let index = 0, previousIndex = normalizedPolygon.length - 1;
    index < normalizedPolygon.length;
    previousIndex = index, index += 1
  ) {
    const start = normalizedPolygon[previousIndex];
    const end = normalizedPolygon[index];

    if (isPointOnSegment(normalizedPoint, start, end)) {
      return true;
    }

    const crossesY = (end.y > normalizedPoint.y) !== (start.y > normalizedPoint.y);
    if (!crossesY) {
      continue;
    }

    const intersectionX = (
      ((start.x - end.x) * (normalizedPoint.y - end.y))
      / (start.y - end.y)
    ) + end.x;

    if (normalizedPoint.x < intersectionX) {
      inside = !inside;
    }
  }

  return inside;
};
