import { isObjectPayload } from "./payload.js";

export const bindMethods = (element, methods) => {
  if (!methods || typeof methods !== "object") {
    return;
  }

  Object.entries(methods).forEach(([methodName, methodFn]) => {
    if (methodName === "default") {
      throw new Error(
        "[Methods] Invalid method name 'default'. Use named exports in .methods.js; default export is not supported.",
      );
    }

    if (typeof methodFn !== "function") {
      return;
    }

    if (methodName in element) {
      throw new Error(
        `[Methods] Cannot define method '${methodName}' because it already exists on the component instance.`,
      );
    }

    Object.defineProperty(element, methodName, {
      configurable: true,
      enumerable: false,
      writable: false,
      value: (payload = {}) => {
        const normalizedPayload = payload === undefined ? {} : payload;
        if (!isObjectPayload(normalizedPayload)) {
          throw new Error(
            `[Methods] Method '${methodName}' expects payload to be an object.`,
          );
        }
        return methodFn.call(element, normalizedPayload);
      },
    });
  });
};
