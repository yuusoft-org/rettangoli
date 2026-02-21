export const isObjectPayload = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};
