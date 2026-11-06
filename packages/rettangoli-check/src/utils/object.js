export const isObjectRecord = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};
