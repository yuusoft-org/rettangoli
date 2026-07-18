import { scheduleFrame } from "./scheduler.js";

export const RETTANGOLI_COMPONENT_MARKER = Symbol.for(
  "@rettangoli/fe/component",
);

const propsSnapshots = new WeakMap();

const createReferenceSnapshot = (value) => ({
  value,
  hasStructuralSnapshot: false,
});

const createPropSnapshot = (value) => {
  if (value === null || typeof value !== "object") {
    return createReferenceSnapshot(value);
  }

  try {
    // Keep the live value for identity and a separate old value only for
    // detecting and reporting same-reference JSON-data mutations.
    const serialized = JSON.stringify(value);
    if (serialized === undefined || typeof structuredClone !== "function") {
      return createReferenceSnapshot(value);
    }
    return {
      value,
      hasStructuralSnapshot: true,
      serialized,
      oldValue: structuredClone(value),
    };
  } catch {
    return createReferenceSnapshot(value);
  }
};

const createPropsSnapshot = (props = {}) => {
  const entries = new Map();
  Object.keys(props).forEach((key) => {
    entries.set(key, createPropSnapshot(props[key]));
  });
  return entries;
};

const propChanged = (previousEntry, nextEntry) => {
  if (!previousEntry || !nextEntry) return true;
  if (previousEntry.hasStructuralSnapshot !== nextEntry.hasStructuralSnapshot) {
    return true;
  }
  if (previousEntry.hasStructuralSnapshot) {
    return previousEntry.serialized !== nextEntry.serialized;
  }
  return !Object.is(previousEntry.value, nextEntry.value);
};

const getChangedPropKeys = (previousSnapshot, nextSnapshot) => {
  const keys = new Set([...previousSnapshot.keys(), ...nextSnapshot.keys()]);
  return [...keys].filter((key) =>
    propChanged(previousSnapshot.get(key), nextSnapshot.get(key)),
  );
};

const defineProp = (target, key, value) => {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
};

const hasDriftedFromSnapshot = (entry) => {
  if (!entry.hasStructuralSnapshot) return false;
  try {
    return JSON.stringify(entry.value) !== entry.serialized;
  } catch {
    return true;
  }
};

const createOldProps = (previousSnapshot) => {
  const oldProps = {};
  previousSnapshot.forEach((entry, key) => {
    defineProp(
      oldProps,
      key,
      hasDriftedFromSnapshot(entry) ? entry.oldValue : entry.value,
    );
  });
  return oldProps;
};

const isRettangoliComponent = (element) => {
  try {
    if (element?.[RETTANGOLI_COMPONENT_MARKER] === true) {
      return true;
    }

    // Compatibility for separately bundled components built before the brand
    // existed. These relationships are installed together by the FE runtime.
    return (
      typeof element?.elementName === "string" &&
      typeof element.render === "function" &&
      typeof element.patch === "function" &&
      typeof element._snabbdomH === "function" &&
      element.deps?.render === element.render &&
      element.deps?.store === element.store &&
      element.deps?.props === element.props
    );
  } catch {
    return false;
  }
};

const storePropsSnapshot = (element, props = {}) => {
  const snapshot = createPropsSnapshot(props);
  propsSnapshots.set(element, snapshot);
  return snapshot;
};

export const createWebComponentUpdateHook = ({
  scheduleFrameFn = scheduleFrame,
} = {}) => {
  return {
    insert: (vnode) => {
      const element = vnode.elm;
      if (!isRettangoliComponent(element)) return;
      storePropsSnapshot(element, vnode.data?.props || {});
    },
    update: (oldVnode, vnode) => {
      const element = vnode.elm;
      if (
        !isRettangoliComponent(element) ||
        typeof element.render !== "function"
      ) {
        return;
      }

      const oldProps = oldVnode.data?.props || {};
      const newProps = vnode.data?.props || {};
      const previousSnapshot =
        propsSnapshots.get(element) || createPropsSnapshot(oldProps);
      const nextSnapshot = storePropsSnapshot(element, newProps);
      const changedPropKeys = getChangedPropKeys(
        previousSnapshot,
        nextSnapshot,
      );
      if (changedPropKeys.length === 0) {
        return;
      }

      const previousProps = createOldProps(previousSnapshot);

      element.setAttribute("isDirty", "true");
      scheduleFrameFn(() => {
        element.render();
        element.removeAttribute("isDirty");

        if (element.handlers && element.handlers.handleOnUpdate) {
          const deps = {
            ...element.deps,
            store: element.store,
            render: element.render.bind(element),
            handlers: element.handlers,
            dispatchEvent: element.dispatchEvent.bind(element),
            refs: element.refIds || {},
          };
          element.handlers.handleOnUpdate(deps, {
            oldProps: previousProps,
            newProps,
          });
        }
      });
    },
  };
};
