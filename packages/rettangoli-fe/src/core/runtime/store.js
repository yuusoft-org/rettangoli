import { produce } from "immer";

import { isObjectPayload } from "./payload.js";

export const bindStore = (store, props, constants) => {
  const { createInitialState, ...selectorsAndActions } = store;
  const selectors = {};
  const actions = {};
  let currentState = {};

  if (createInitialState) {
    currentState = createInitialState({ props, constants });
  }

  Object.entries(selectorsAndActions).forEach(([key, fn]) => {
    if (key.startsWith("select")) {
      selectors[key] = (...args) => {
        return fn({ state: currentState, props, constants }, ...args);
      };
      return;
    }

    actions[key] = (payload = {}) => {
      const normalizedPayload = payload === undefined ? {} : payload;
      if (!isObjectPayload(normalizedPayload)) {
        throw new Error(
          `[Store] Action '${key}' expects payload to be an object.`,
        );
      }
      currentState = produce(currentState, (draft) => {
        return fn({ state: draft, props, constants }, normalizedPayload);
      });
      return currentState;
    };
  });

  return {
    getState: () => currentState,
    ...actions,
    ...selectors,
  };
};
