import { scheduleFrame } from "./scheduler.js";
import { PARENT_UPDATE_TRANSACTION } from "../core/runtime/updateTransaction.js";

export const RETTANGOLI_COMPONENT_MARKER = Symbol.for(
  "@rettangoli/fe/component",
);

const propsSnapshots = new WeakMap();
const pendingUpdates = new WeakMap();
const immutableSnapshots = new WeakMap();

// Frozen JSON records cannot drift. Guard the shared prototypes as well:
// adding an inherited toJSON can change serialization even for frozen data.
const hasStandardJsonPrototypes = () => (
  Object.getPrototypeOf(Object.prototype) === null
  && Object.getPrototypeOf(Array.prototype) === Object.prototype
  && !Object.hasOwn(Object.prototype, "toJSON")
  && !Object.hasOwn(Array.prototype, "toJSON")
);

const createReferenceSnapshot = (value) => ({
  value,
  hasStructuralSnapshot: false,
});

const hasUnsupportedToJSONOrPrototypeCycle = (value) => {
  const visited = new Set();
  let current = value;

  while (current !== null) {
    if (visited.has(current)) return true;
    visited.add(current);

    const descriptor = Object.getOwnPropertyDescriptor(current, "toJSON");
    if (descriptor) {
      if (!("value" in descriptor)) return true;
      return typeof descriptor.value === "function";
    }
    current = Object.getPrototypeOf(current);
  }

  return false;
};

const isJsonData = (value, ancestors = new Set(), validation = {}) => {
  if (value === null) return true;

  const valueType = typeof value;
  if (valueType === "string" || valueType === "boolean") return true;
  if (valueType === "number") {
    return Number.isFinite(value) && !Object.is(value, -0);
  }
  if (valueType !== "object") return false;

  if (ancestors.has(value)) return false;

  const isArray = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (
    (isArray && prototype !== Array.prototype) ||
    (!isArray && prototype !== Object.prototype && prototype !== null)
  ) {
    return false;
  }

  if (hasUnsupportedToJSONOrPrototypeCycle(value)) return false;
  if (!Object.isFrozen(value)) validation.mutable = true;

  ancestors.add(value);
  try {
    if (isArray) {
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.length !== value.length + 1 || !ownKeys.includes("length")) {
        return false;
      }

      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(
          value,
          String(index),
        );
        if (
          !descriptor ||
          !("value" in descriptor) ||
          !descriptor.enumerable ||
          !isJsonData(descriptor.value, ancestors, validation)
        ) {
          return false;
        }
      }

      return true;
    }

    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") return false;

      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor ||
        !("value" in descriptor) ||
        !descriptor.enumerable ||
        !isJsonData(descriptor.value, ancestors, validation)
      ) {
        return false;
      }
    }

    return true;
  } finally {
    ancestors.delete(value);
  }
};

const createPropSnapshot = (value, previousEntry) => {
  if (value === null || typeof value !== "object") {
    return createReferenceSnapshot(value);
  }

  try {
    const immutableSnapshot = immutableSnapshots.get(value);
    if (immutableSnapshot && hasStandardJsonPrototypes()) {
      return immutableSnapshot;
    }
    const validation = {};
    if (!isJsonData(value, new Set(), validation)) {
      return createReferenceSnapshot(value);
    }

    // Keep the live value for identity and a separate old value only for
    // detecting and reporting same-reference JSON-data mutations.
    const serialized = JSON.stringify(value);
    if (serialized === undefined || typeof structuredClone !== "function") {
      return createReferenceSnapshot(value);
    }
    if (previousEntry?.hasStructuralSnapshot && previousEntry.serialized === serialized) {
      const snapshot = previousEntry.value === value && previousEntry.immutable === !validation.mutable
        ? previousEntry
        : { ...previousEntry, value, immutable: !validation.mutable };
      if (snapshot.immutable && hasStandardJsonPrototypes()) immutableSnapshots.set(value, snapshot);
      return snapshot;
    }
    const snapshot = {
      value,
      hasStructuralSnapshot: true,
      serialized,
      oldValue: structuredClone(value),
      immutable: !validation.mutable,
    };
    if (snapshot.immutable && hasStandardJsonPrototypes()) {
      immutableSnapshots.set(value, snapshot);
    }
    return snapshot;
  } catch {
    return createReferenceSnapshot(value);
  }
};

const createPropsSnapshot = (props = {}, previousSnapshot) => {
  const entries = new Map();
  Object.keys(props).forEach((key) => {
    entries.set(key, createPropSnapshot(props[key], previousSnapshot?.get(key)));
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
  if (!entry.hasStructuralSnapshot || entry.immutable) return false;
  try {
    if (!isJsonData(entry.value)) return true;
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

export const isRettangoliComponent = (element) => {
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

export const cancelPendingComponentUpdate = (element) => {
  pendingUpdates.delete(element);
  propsSnapshots.delete(element);
  element.removeAttribute("isDirty");
};

const runPendingUpdate = (element, pendingUpdate) => {
  if (pendingUpdates.get(element) !== pendingUpdate) return;

  pendingUpdates.delete(element);
  if (element.isConnected === false) {
    element.removeAttribute("isDirty");
    return;
  }

  // Prop values remain live references between the parent render and this
  // frame. Refresh the latest snapshot so the stored baseline matches the
  // value the child is about to render.
  const nextSnapshot = createPropsSnapshot(pendingUpdate.newProps, pendingUpdate.nextSnapshot);
  propsSnapshots.set(element, nextSnapshot);
  const changedPropKeys = getChangedPropKeys(
    pendingUpdate.previousSnapshot,
    nextSnapshot,
  );

  if (changedPropKeys.length === 0) {
    element.removeAttribute("isDirty");
    return;
  }

  const previousProps = createOldProps(pendingUpdate.previousSnapshot);

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
      newProps: pendingUpdate.newProps,
    });
  }
};

export const createWebComponentUpdateHook = ({
  scheduleFrameFn = scheduleFrame,
} = {}) => {
  return {
    prepatch: (oldVnode, vnode) => {
      if (isRettangoliComponent(oldVnode.elm)) {
        oldVnode.elm[PARENT_UPDATE_TRANSACTION] = true;
      }
    },
    postpatch: (oldVnode, vnode) => {
      if (isRettangoliComponent(vnode.elm)) {
        vnode.elm[PARENT_UPDATE_TRANSACTION] = false;
      }
    },
    destroy: (vnode) => {
      if (isRettangoliComponent(vnode.elm)) {
        cancelPendingComponentUpdate(vnode.elm);
      }
    },
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
      const pendingUpdate = pendingUpdates.get(element);

      if (pendingUpdate) {
        pendingUpdate.newProps = newProps;
        return;
      }

      const previousSnapshot =
        propsSnapshots.get(element) || createPropsSnapshot(oldProps);
      const nextSnapshot = createPropsSnapshot(newProps, previousSnapshot);
      const changedPropKeys = getChangedPropKeys(
        previousSnapshot,
        nextSnapshot,
      );
      if (changedPropKeys.length === 0) {
        propsSnapshots.set(element, nextSnapshot);
        return;
      }

      const nextPendingUpdate = {
        previousSnapshot,
        nextSnapshot,
        newProps,
      };
      pendingUpdates.set(element, nextPendingUpdate);

      element.setAttribute("isDirty", "true");
      scheduleFrameFn(() => {
        runPendingUpdate(element, nextPendingUpdate);
      });
    },
  };
};
