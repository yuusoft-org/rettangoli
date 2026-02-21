import { isObjectPayload } from "./payload.js";

export const deepFreeze = (value) => {
  if (!isObjectPayload(value) || Object.isFrozen(value)) {
    return value;
  }

  Object.values(value).forEach((nestedValue) => {
    deepFreeze(nestedValue);
  });

  return Object.freeze(value);
};

export const resolveConstants = ({ setupConstants, fileConstants }) => {
  const normalizedSetupConstants = isObjectPayload(setupConstants)
    ? setupConstants
    : {};
  const normalizedFileConstants = isObjectPayload(fileConstants)
    ? fileConstants
    : {};

  return deepFreeze({
    ...normalizedSetupConstants,
    ...normalizedFileConstants,
  });
};
