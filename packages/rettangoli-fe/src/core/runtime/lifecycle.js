import { resolvePropKeyForAttribute } from "./props.js";
import { syncObject } from "./syncObject.js";

// The deps objects components receive. Every channel builds its deps here:
// - el.deps (syncComponentDeps): the setup deps plus the element's own
//   store, render, handlers, props and constants.
// - el._runtimeDeps (syncRuntimeDeps): el.deps plus refs, dispatchEvent and a
//   bound render. Lifecycle hooks, ref event handlers, store actions and
//   prop/attribute handleOnUpdate get it.
// - buildParentUpdateDeps: a fresh copy for handleOnUpdate after a parent
//   patch.
// el.deps and el._runtimeDeps are synced in place, so code that holds them
// sees later updates.

const defineI18nGetter = (deps, getI18nRuntime) => {
  Object.defineProperty(deps, "i18n", {
    enumerable: true,
    configurable: true,
    get: () => getI18nRuntime().getMessages(),
  });
};

export const syncComponentDeps = (instance, sourceDeps) => {
  const nextDeps = {
    ...sourceDeps,
    locale: instance.i18nRuntime?.locale || sourceDeps?.locale,
    store: instance.store,
    render: instance.render,
    handlers: instance.handlers,
    props: instance.props,
    constants: instance.constants,
  };

  if (instance.i18nRuntime) {
    defineI18nGetter(nextDeps, () => instance.i18nRuntime);
  }

  if (!instance.deps) {
    instance.deps = {};
  }
  return syncObject(instance.deps, nextDeps);
};

export const createRuntimeDeps = ({
  baseDeps,
  refs,
  dispatchEvent,
  store,
  render,
}) => {
  const runtimeDeps = {
    ...baseDeps,
    refs,
    dispatchEvent,
    store,
    render,
  };

  if (baseDeps?.__rtglI18nRuntime) {
    defineI18nGetter(runtimeDeps, () => baseDeps.__rtglI18nRuntime);
    runtimeDeps.locale = baseDeps.__rtglI18nRuntime.locale;
  }

  return runtimeDeps;
};

export const syncRuntimeDeps = (instance) => {
  const nextRuntimeDeps = createRuntimeDeps({
    baseDeps: instance.deps,
    refs: instance.refIds,
    dispatchEvent: instance.dispatchEvent.bind(instance),
    store: instance.store,
    render: instance.render.bind(instance),
  });

  if (!instance._runtimeDeps) {
    instance._runtimeDeps = nextRuntimeDeps;
    return instance._runtimeDeps;
  }
  return syncObject(instance._runtimeDeps, nextRuntimeDeps);
};

// The child may belong to another bundle's runtime, so this reads only the
// fields every runtime installs. i18n is copied as a value, not a getter.
export const buildParentUpdateDeps = (element) => ({
  ...element.deps,
  store: element.store,
  render: element.render.bind(element),
  handlers: element.handlers,
  dispatchEvent: element.dispatchEvent.bind(element),
  refs: element.refIds || {},
});

// Copies arrays and plain objects (prototype Object.prototype or null) so a
// store action may mutate its payload. Arrays drop undefined entries and
// holes, and null-prototype objects become plain, as the payload template
// render did before. Every other value (events, Dates, Files, class
// instances, functions) passes by reference.
const clonePlainData = (value) => {
  if (Array.isArray(value)) {
    const copy = [];
    for (const item of value) {
      if (item !== undefined) {
        copy.push(clonePlainData(item));
      }
    }
    return copy;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }
  const copy = {};
  for (const key of Object.keys(value)) {
    copy[key] = clonePlainData(value[key]);
  }
  return copy;
};

// The payload was already rendered once by the event listener, against the
// view data and the event. It is not rendered again: text in it stays literal.
export const createStoreActionDispatcher = ({
  store,
  render,
}) => {
  return (payload) => {
    const { _action } = payload;
    const context = clonePlainData(payload);

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
}) => {
  const transformedHandlers = {
    handleCallStoreAction: createStoreActionDispatcher({
      store: deps.store,
      render: deps.render,
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
  normalizeAttributeValue,
}) => {
  const changedProp = resolvePropKeyForAttribute(attributeName, propsSchemaKeys);
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

export const buildOnPropUpdateChanges = ({
  propName,
  oldValue,
  newValue,
  deps,
  propsSchemaKeys,
}) => {
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

  if (oldValue === undefined) {
    delete oldProps[propName];
  } else {
    oldProps[propName] = oldValue;
  }

  if (newValue === undefined) {
    delete newProps[propName];
  } else {
    newProps[propName] = newValue;
  }

  return {
    changedProp: propName,
    oldProps,
    newProps,
  };
};
