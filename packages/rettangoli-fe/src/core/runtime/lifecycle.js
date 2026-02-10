export const createRuntimeDeps = ({
  baseDeps,
  refs,
  dispatchEvent,
  store,
  render,
}) => {
  return {
    ...baseDeps,
    refs,
    dispatchEvent,
    store,
    render,
  };
};

export const createStoreActionDispatcher = ({
  store,
  render,
  parseAndRenderFn,
}) => {
  return (payload) => {
    const { _event, _action } = payload;
    const context = parseAndRenderFn(payload, {
      _event,
    });

    if (!store[_action]) {
      throw new Error(`[Store] Action 'store.${_action}' is not defined.`);
    }

    store[_action](context);
    render();
  };
};

export const createTransformedHandlers = ({
  handlers,
  deps,
  parseAndRenderFn,
}) => {
  const transformedHandlers = {
    handleCallStoreAction: createStoreActionDispatcher({
      store: deps.store,
      render: deps.render,
      parseAndRenderFn,
    }),
  };

  Object.keys(handlers || {}).forEach((key) => {
    transformedHandlers[key] = (payload) => {
      return handlers[key](deps, payload);
    };
  });

  return transformedHandlers;
};

export const ensureSyncBeforeMountResult = (beforeMountResult) => {
  if (beforeMountResult && typeof beforeMountResult.then === "function") {
    throw new Error("handleBeforeMount must be synchronous and cannot return a Promise.");
  }
  return beforeMountResult;
};

export const runBeforeMount = ({ handlers, deps }) => {
  if (!handlers?.handleBeforeMount) {
    return undefined;
  }
  const beforeMountResult = handlers.handleBeforeMount(deps);
  return ensureSyncBeforeMountResult(beforeMountResult);
};

export const runAfterMount = ({ handlers, deps }) => {
  if (!handlers?.handleAfterMount) {
    return;
  }
  handlers.handleAfterMount(deps);
};

export const buildOnUpdateChanges = ({
  attributeName,
  oldValue,
  newValue,
  deps,
  propsSchemaKeys,
  toCamelCase,
  normalizeAttributeValue,
}) => {
  const changedProp = toCamelCase(attributeName);
  const newProps = {};

  propsSchemaKeys.forEach((propKey) => {
    const propValue = deps.props[propKey];
    if (propValue !== undefined) {
      newProps[propKey] = propValue;
    }
  });

  const oldProps = {
    ...newProps,
  };

  const normalizedOldValue = normalizeAttributeValue(oldValue);
  const normalizedNewValue = normalizeAttributeValue(newValue);

  if (normalizedOldValue === undefined) {
    delete oldProps[changedProp];
  } else {
    oldProps[changedProp] = normalizedOldValue;
  }

  if (normalizedNewValue === undefined) {
    delete newProps[changedProp];
  } else {
    newProps[changedProp] = normalizedNewValue;
  }

  return {
    changedProp,
    oldProps,
    newProps,
  };
};
