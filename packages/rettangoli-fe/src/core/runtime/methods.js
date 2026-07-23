import { isObjectPayload } from "./payload.js";

const boundMethodState = new WeakMap();

const normalizeMethods = (methods) => {
  if (!methods || typeof methods !== "object") {
    return {};
  }

  Object.entries(methods).forEach(([methodName]) => {
    if (methodName === "default") {
      throw new Error(
        "[Methods] Invalid method name 'default'. Use named exports in .methods.js; default export is not supported.",
      );
    }
  });

  return methods;
};

const createBoundMethod = ({ element, methodName, state }) => {
  return (payload = {}) => {
    const normalizedPayload = payload === undefined ? {} : payload;
    if (!isObjectPayload(normalizedPayload)) {
      throw new Error(
        `[Methods] Method '${methodName}' expects payload to be an object.`,
      );
    }

    const methodFn = state.methods[methodName];
    if (typeof methodFn !== "function") {
      throw new Error(`[Methods] Method '${methodName}' is not defined.`);
    }
    return methodFn.call(element, normalizedPayload);
  };
};

const installMethod = ({ element, methodName, state }) => {
  if (!state.wrappers.has(methodName)) {
    state.wrappers.set(
      methodName,
      createBoundMethod({ element, methodName, state }),
    );
  }

  Object.defineProperty(element, methodName, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: state.wrappers.get(methodName),
  });
};

export const bindMethods = (element, methods) => {
  const normalizedMethods = normalizeMethods(methods);
  const state = {
    methods: normalizedMethods,
    wrappers: new Map(),
  };

  Object.entries(normalizedMethods).forEach(([methodName, methodFn]) => {

    if (typeof methodFn !== "function") {
      return;
    }

    if (methodName in element) {
      throw new Error(
        `[Methods] Cannot define method '${methodName}' because it already exists on the component instance.`,
      );
    }

    installMethod({ element, methodName, state });
  });

  boundMethodState.set(element, state);
};

export const prepareHotUpdateBoundMethods = (element, methods) => {
  const normalizedMethods = normalizeMethods(methods);
  const state = boundMethodState.get(element);

  if (!state) {
    Object.entries(normalizedMethods).forEach(([methodName, methodFn]) => {
      if (typeof methodFn === "function" && methodName in element) {
        throw new Error(
          `[Methods] Cannot define method '${methodName}' because it already exists on the component instance.`,
        );
      }
    });
    return {
      element,
      normalizedMethods,
      state: null,
    };
  }

  const nextMethodNames = new Set(
    Object.entries(normalizedMethods)
      .filter(([, methodFn]) => typeof methodFn === "function")
      .map(([methodName]) => methodName),
  );

  Object.entries(normalizedMethods).forEach(([methodName, methodFn]) => {
    if (typeof methodFn !== "function" || state.wrappers.has(methodName)) {
      return;
    }
    if (methodName in element) {
      throw new Error(
        `[Methods] Cannot define method '${methodName}' because it already exists on the component instance.`,
      );
    }
  });

  state.wrappers.forEach((_wrapper, methodName) => {
    const descriptor = Object.getOwnPropertyDescriptor(element, methodName);
    if (descriptor && descriptor.configurable === false) {
      throw new Error(
        `[Methods] Cannot hot-update method '${methodName}' because its component property is not configurable.`,
      );
    }
  });

  return {
    element,
    nextMethodNames,
    normalizedMethods,
    state,
  };
};

export const commitHotUpdateBoundMethods = (preparedUpdate) => {
  const {
    element,
    nextMethodNames,
    normalizedMethods,
    state,
  } = preparedUpdate;

  if (!state) {
    bindMethods(element, normalizedMethods);
    return;
  }

  state.wrappers.forEach((_wrapper, methodName) => {
    if (!nextMethodNames.has(methodName)) {
      delete element[methodName];
    }
  });

  state.methods = normalizedMethods;
  nextMethodNames.forEach((methodName) => {
    installMethod({ element, methodName, state });
  });
};

export const hotUpdateBoundMethods = (element, methods) => {
  const preparedUpdate = prepareHotUpdateBoundMethods(element, methods);
  commitHotUpdateBoundMethods(preparedUpdate);
};
