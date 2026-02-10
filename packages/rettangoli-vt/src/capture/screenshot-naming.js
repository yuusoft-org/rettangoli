export function formatScreenshotOrdinal(index) {
  if (!Number.isInteger(index) || index < 1) {
    throw new Error(
      `screenshot index must be an integer >= 1, got ${index}.`,
    );
  }
  if (index > 99) {
    throw new Error(
      `screenshot index ${index} exceeds supported range (01-99).`,
    );
  }
  return String(index).padStart(2, "0");
}
