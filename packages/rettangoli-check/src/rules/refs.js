import { createRefMatchers } from "@rettangoli/fe/contracts";
import { isObjectRecord } from "./shared.js";

export const collectInvalidRefKeys = (refs) => {
  const invalidRefKeys = new Set();

  if (!isObjectRecord(refs)) {
    return invalidRefKeys;
  }

  Object.entries(refs).forEach(([refKey, refConfig]) => {
    try {
      createRefMatchers({ [refKey]: refConfig });
    } catch {
      invalidRefKeys.add(refKey);
    }
  });

  return invalidRefKeys;
};
