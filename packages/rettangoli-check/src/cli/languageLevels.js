export const LANGUAGE_LEVELS = [
  "strict-legacy-parity",
  "strict-deterministic-core",
  "compiler-platform-v1",
];

export const DEFAULT_LANGUAGE_LEVEL = "strict-deterministic-core";

const indexByLevel = new Map(LANGUAGE_LEVELS.map((level, index) => [level, index]));

export const isKnownLanguageLevel = (value = "") => indexByLevel.has(value);

export const resolveLanguageLevelTransition = ({ fromLevel, toLevel }) => {
  if (!isKnownLanguageLevel(fromLevel) || !isKnownLanguageLevel(toLevel)) {
    return [];
  }

  const fromIndex = indexByLevel.get(fromLevel);
  const toIndex = indexByLevel.get(toLevel);
  if (fromIndex === toIndex) {
    return [fromLevel];
  }

  if (fromIndex < toIndex) {
    return LANGUAGE_LEVELS.slice(fromIndex, toIndex + 1);
  }

  return [...LANGUAGE_LEVELS.slice(toIndex, fromIndex + 1)].reverse();
};
