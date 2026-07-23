import { produce } from "immer";

import { isObjectPayload } from "./payload.js";

const RETTANGOLI_STORE_HOT_UPDATE = Symbol.for(
  "@rettangoli/fe/store-hot-update",
);

const splitStoreDefinition = (store = {}) => {
  const { createInitialState, ...selectorsAndActions } = store;
  return {
    createInitialState,
    selectorsAndActions,
  };
};

export const bindStore = (store, props, constants, runtimeContext = {}) => {
  const initialDefinition = splitStoreDefinition(store);
  let selectorsAndActions = initialDefinition.selectorsAndActions;
  let currentProps = props;
  let currentConstants = constants;
  let currentRuntimeContext = runtimeContext;
  let currentState = {};

  const createStoreContext = (state) => ({
    state,
    props: currentProps,
    constants: currentConstants,
    i18n: currentRuntimeContext.getI18n?.() || {},
    locale: currentRuntimeContext.locale,
  });

  if (initialDefinition.createInitialState) {
    currentState = initialDefinition.createInitialState({ props, constants });
  }

  const boundStore = {
    getState: () => currentState,
  };
  const stableFunctions = new Map();

  const getStableFunction = (key) => {
    if (!stableFunctions.has(key)) {
      if (key.startsWith("select")) {
        stableFunctions.set(key, (...args) => {
          const fn = selectorsAndActions[key];
          if (typeof fn !== "function") {
            throw new Error(`[Store] Selector '${key}' is not defined.`);
          }
          return fn(createStoreContext(currentState), ...args);
        });
      } else {
        stableFunctions.set(key, (payload = {}) => {
          const fn = selectorsAndActions[key];
          if (typeof fn !== "function") {
            throw new Error(`[Store] Action '${key}' is not defined.`);
          }
          const normalizedPayload = payload === undefined ? {} : payload;
          if (!isObjectPayload(normalizedPayload)) {
            throw new Error(
              `[Store] Action '${key}' expects payload to be an object.`,
            );
          }
          currentState = produce(currentState, (draft) => {
            return fn(createStoreContext(draft), normalizedPayload);
          });
          return currentState;
        });
      }
    }
    return stableFunctions.get(key);
  };

  const reconcileDefinition = (nextDefinition) => {
    const nextKeys = new Set(Object.keys(nextDefinition));

    Object.keys(selectorsAndActions).forEach((key) => {
      if (!nextKeys.has(key)) {
        delete boundStore[key];
      }
    });

    selectorsAndActions = nextDefinition;
    Object.keys(selectorsAndActions).forEach((key) => {
      boundStore[key] = getStableFunction(key);
    });
  };

  reconcileDefinition(selectorsAndActions);

  Object.defineProperty(boundStore, RETTANGOLI_STORE_HOT_UPDATE, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: ({
      store: nextStore,
      props: nextProps,
      constants: nextConstants,
      runtimeContext: nextRuntimeContext = {},
    }) => {
      const nextDefinition = splitStoreDefinition(nextStore);
      currentProps = nextProps;
      currentConstants = nextConstants;
      currentRuntimeContext = nextRuntimeContext;
      // Deliberately retain currentState. Running the new createInitialState here
      // would make a hot update indistinguishable from a remount.
      reconcileDefinition(nextDefinition.selectorsAndActions);
      return currentState;
    },
  });

  return boundStore;
};

export const hotUpdateBoundStore = ({
  boundStore,
  store,
  props,
  constants,
  runtimeContext,
}) => {
  const update = boundStore?.[RETTANGOLI_STORE_HOT_UPDATE];
  if (typeof update !== "function") {
    throw new Error("[HMR] Component store does not support hot updates.");
  }
  return update({ store, props, constants, runtimeContext });
};

export const prepareHotUpdateBoundStore = ({
  boundStore,
  store,
  props,
  constants,
  runtimeContext,
}) => {
  if (typeof boundStore?.[RETTANGOLI_STORE_HOT_UPDATE] !== "function") {
    throw new Error("[HMR] Component store does not support hot updates.");
  }
  // Normalize eagerly so invalid definition shapes fail before any component
  // instance or registry record is changed.
  splitStoreDefinition(store);
  return {
    boundStore,
    store,
    props,
    constants,
    runtimeContext,
  };
};
