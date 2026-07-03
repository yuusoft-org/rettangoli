export const calculatePopoverPosition = ({
  x,
  y,
  width,
  height,
  place,
  viewportWidth,
  viewportHeight,
  offset = 8,
  padding = 8,
}) => {
  let left = x;
  let top = y;

  switch (place) {
    case "t":
      left = x - width / 2;
      top = y - height - offset;
      break;
    case "ts":
      left = x;
      top = y - height - offset;
      break;
    case "te":
      left = x - width;
      top = y - height - offset;
      break;
    case "r":
      left = x + offset;
      top = y - height / 2;
      break;
    case "rs":
      left = x + offset;
      top = y;
      break;
    case "re":
      left = x + offset;
      top = y - height;
      break;
    case "b":
      left = x - width / 2;
      top = y + offset;
      break;
    case "bs":
      left = x;
      top = y + offset;
      break;
    case "be":
      left = x - width;
      top = y + offset;
      break;
    case "l":
      left = x - width - offset;
      top = y - height / 2;
      break;
    case "ls":
      left = x - width - offset;
      top = y;
      break;
    case "le":
      left = x - width - offset;
      top = y - height;
      break;
    case "center":
    case "c":
      left = (viewportWidth - width) / 2;
      top = (viewportHeight - height) / 2;
      break;
    default:
      left = x;
      top = y + offset;
      break;
  }

  return {
    left: Math.max(padding, Math.min(left, viewportWidth - width - padding)),
    top: Math.max(padding, Math.min(top, viewportHeight - height - padding)),
  };
};
