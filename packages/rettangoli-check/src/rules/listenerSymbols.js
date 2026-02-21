const LISTENER_SYMBOL_REGEX = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const HANDLER_SYMBOL_PREFIX = "handle";
const MISSING_SYMBOL = () => ({ isDefined: false, isValid: false, value: null });

export const isListenerEventConfig = (eventConfig) => {
  return Boolean(eventConfig) && typeof eventConfig === "object" && !Array.isArray(eventConfig);
};

export const getListenerSymbol = ({ eventConfig, symbolName }) => {
  if (!isListenerEventConfig(eventConfig)) {
    return MISSING_SYMBOL();
  }

  if (!Object.prototype.hasOwnProperty.call(eventConfig, symbolName)) {
    return MISSING_SYMBOL();
  }

  const value = eventConfig[symbolName];
  if (typeof value !== "string" || !LISTENER_SYMBOL_REGEX.test(value)) {
    return { isDefined: true, isValid: false, value: null };
  }

  return { isDefined: true, isValid: true, value };
};

export const getListenerSymbols = (eventConfig) => {
  return {
    handler: getListenerSymbol({ eventConfig, symbolName: "handler" }),
    action: getListenerSymbol({ eventConfig, symbolName: "action" }),
  };
};

export const isValidHandlerSymbol = (value) => {
  return typeof value === "string"
    && LISTENER_SYMBOL_REGEX.test(value)
    && value.startsWith(HANDLER_SYMBOL_PREFIX);
};

export const resolveListenerLine = ({ listenerLine, optionLines, preferredKeys = [] }) => {
  for (let index = 0; index < preferredKeys.length; index += 1) {
    const key = preferredKeys[index];
    const keyLine = optionLines?.[key];
    if (Number.isInteger(keyLine)) {
      return keyLine;
    }
  }

  return Number.isInteger(listenerLine) ? listenerLine : undefined;
};
