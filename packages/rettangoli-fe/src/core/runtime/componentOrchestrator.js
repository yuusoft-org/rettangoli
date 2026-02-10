import { parseView } from "../../parser.js";
import { createTransformedHandlers, runAfterMount, runBeforeMount } from "./lifecycle.js";
import { attachGlobalRefListeners } from "./globalListeners.js";
import { collectRefElements } from "./refs.js";
import {
  createComponentRuntimeDeps,
  cleanupEventRateLimitState,
  syncRefIds,
} from "./componentRuntime.js";
import { buildOnUpdateChanges } from "./lifecycle.js";
import { normalizeAttributeValue, toCamelCase } from "./props.js";

export const createRuntimeDepsForInstance = ({ instance }) => {
  return createComponentRuntimeDeps({
    baseDeps: instance.deps,
    refs: instance.refIds,
    dispatchEvent: instance.dispatchEvent.bind(instance),
    store: instance.store,
    render: instance.render.bind(instance),
  });
};

export const runConnectedComponentLifecycle = ({
  instance,
  parseAndRenderFn,
  renderFn,
  createTransformedHandlersFn = createTransformedHandlers,
  runBeforeMountFn = runBeforeMount,
  attachGlobalRefListenersFn = attachGlobalRefListeners,
  runAfterMountFn = runAfterMount,
}) => {
  const runtimeDeps = createRuntimeDepsForInstance({ instance });

  instance.transformedHandlers = createTransformedHandlersFn({
    handlers: instance.handlers,
    deps: runtimeDeps,
    parseAndRenderFn,
  });

  instance._unmountCallback = runBeforeMountFn({
    handlers: instance.handlers,
    deps: runtimeDeps,
  });

  instance._globalListenersCleanup = attachGlobalRefListenersFn({
    refs: instance.refs,
    handlers: instance.transformedHandlers,
    parseAndRenderFn,
  });

  renderFn();

  runAfterMountFn({
    handlers: instance.handlers,
    deps: runtimeDeps,
  });

  return runtimeDeps;
};

export const runDisconnectedComponentLifecycle = ({
  instance,
  clearTimerFn = clearTimeout,
}) => {
  if (instance._unmountCallback) {
    instance._unmountCallback();
  }
  if (instance._globalListenersCleanup) {
    instance._globalListenersCleanup();
  }
  return cleanupEventRateLimitState({
    transformedHandlers: instance.transformedHandlers,
    clearTimerFn,
  });
};

export const runAttributeChangedComponentLifecycle = ({
  instance,
  attributeName,
  oldValue,
  newValue,
  scheduleFrameFn,
}) => {
  if (oldValue === newValue || !instance.render) {
    return;
  }

  if (instance.handlers?.handleOnUpdate) {
    const runtimeDeps = createRuntimeDepsForInstance({ instance });
    const changes = buildOnUpdateChanges({
      attributeName,
      oldValue,
      newValue,
      deps: runtimeDeps,
      propsSchemaKeys: instance._propsSchemaKeys,
      toCamelCase,
      normalizeAttributeValue,
    });
    instance.handlers.handleOnUpdate(runtimeDeps, changes);
    return;
  }

  scheduleFrameFn(() => {
    instance.render();
  });
};

export const runRenderComponentLifecycle = ({
  instance,
  createComponentUpdateHookFn,
  parseViewFn = parseView,
  collectRefElementsFn = collectRefElements,
  onError = (error) => {
    console.error("Error during render:", error);
  },
}) => {
  if (!instance.patch) {
    console.error("Patch function is not defined!");
    return null;
  }

  if (!instance.template) {
    console.error("Template is not defined!");
    return null;
  }

  try {
    const vDom = parseViewFn({
      h: instance._snabbdomH,
      template: instance.template,
      viewData: instance.viewData,
      refs: instance.refs,
      handlers: instance.transformedHandlers,
      createComponentUpdateHook: createComponentUpdateHookFn,
    });

    if (!instance._oldVNode) {
      instance._oldVNode = instance.patch(instance.renderTarget, vDom);
    } else {
      instance._oldVNode = instance.patch(instance._oldVNode, vDom);
    }

    const ids = collectRefElementsFn({
      rootVNode: instance._oldVNode,
      refs: instance.refs,
    });
    syncRefIds({
      refIds: instance.refIds,
      nextRefIds: ids,
    });
    return instance._oldVNode;
  } catch (error) {
    onError(error);
    // Preserve _oldVNode so subsequent renders can still patch against
    // the last successful vdom tree. The component is not permanently broken.
    return instance._oldVNode || null;
  }
};
