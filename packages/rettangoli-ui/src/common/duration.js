const INTEGER_PATTERN = /^\d+$/;
const SECONDS_PATTERN = /^(\d{1,2})(?:\.(\d{1,3}))?$/;

export const normalizeDurationMilliseconds = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const normalizedValue = typeof value === "string" ? value.trim() : value;
  if (
    typeof normalizedValue === "string" &&
    !INTEGER_PATTERN.test(normalizedValue)
  ) {
    return null;
  }

  const numericValue = typeof normalizedValue === "number"
    ? normalizedValue
    : Number(normalizedValue);
  if (
    !Number.isSafeInteger(numericValue) ||
    numericValue < 0
  ) {
    return null;
  }

  return numericValue;
};

const parseSecondsSegment = (segment) => {
  const match = SECONDS_PATTERN.exec(segment);
  if (!match) return null;

  const seconds = Number(match[1]);
  if (seconds > 59) return null;

  const milliseconds = match[2]
    ? Number(match[2].padEnd(3, "0"))
    : 0;

  return { milliseconds, seconds };
};

export const parseDurationText = (value) => {
  if (typeof value !== "string") return null;

  const text = value.trim();
  if (text === "") return null;

  const segments = text.split(":");
  if (segments.length !== 2 && segments.length !== 3) {
    return null;
  }

  const secondsPart = parseSecondsSegment(segments.at(-1));
  if (!secondsPart) return null;

  let hours = 0;
  let minutes;

  if (segments.length === 2) {
    if (!INTEGER_PATTERN.test(segments[0])) return null;
    minutes = Number(segments[0]);
  } else {
    if (
      !INTEGER_PATTERN.test(segments[0]) ||
      !INTEGER_PATTERN.test(segments[1])
    ) {
      return null;
    }

    hours = Number(segments[0]);
    minutes = Number(segments[1]);
    if (minutes > 59) return null;
  }

  const totalMilliseconds =
    ((hours * 60 * 60) + (minutes * 60) + secondsPart.seconds) * 1000 +
    secondsPart.milliseconds;

  return Number.isSafeInteger(totalMilliseconds)
    ? totalMilliseconds
    : null;
};

export const formatDurationMilliseconds = (value) => {
  const milliseconds = normalizeDurationMilliseconds(value);
  if (milliseconds === null) return "";

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millisecondRemainder = milliseconds % 1000;

  const secondsText = String(seconds).padStart(2, "0");
  const base = hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${secondsText}`
    : `${minutes}:${secondsText}`;

  if (millisecondRemainder === 0) return base;

  const fraction = String(millisecondRemainder)
    .padStart(3, "0")
    .replace(/0+$/, "");
  return `${base}.${fraction}`;
};
