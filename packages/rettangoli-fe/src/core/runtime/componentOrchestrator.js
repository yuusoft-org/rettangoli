import { parseView } from "../../parser.js";
import {
  buildOnPropUpdateChanges,
  buildOnUpdateChanges,
  createTransformedHandlers,
  runAfterMount,
  runBeforeMount,
  syncRuntimeDeps,
} from "./lifecycle.js";
import { attachGlobalRefListeners } from "./globalListeners.js";
import { collectRefElements } from "./refs.js";
import {
  cleanupEventRateLimitState,
  syncRefIds,
} from "./componentRuntime.js";
import { normalizeAttributeValue } from "./props.js";
import { PARENT_UPDATE_TRANSACTION } from "../protocol.js";

export const runConnectedComponentLifecycle = ({
  instance,
  parseAndRenderFn,
  renderFn,
  createTransformedHandlersFn = createTransformedHandlers,
  runBeforeMountFn = runBeforeMount,
  attachGlobalRefListenersFn = attachGlobalRefListeners,
  runAfterMountFn = runAfterMount,
}) => {
  const runtimeDeps = syncRuntimeDeps(instance);

  instance.transformedHandlers = createTransformedHandlersFn({
    handlers: instance.handlers,
    deps: runtimeDeps,
  });

  instance._unmountCallback = runBeforeMountFn({
    handlers: instance.handlers,
    deps: runtimeDeps,
  });

  instance._globalListenersCleanup = attachGlobalRefListenersFn({
    refs: instance.refs,
    handlers: instance.transformedHandlers,
    parseAndRenderFn,
    getPayloadContext: () => instance.viewData,
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

export const runHotUpdatedComponentLifecycle = ({
  instance,
  parseAndRenderFn,
  clearTimerFn = clearTimeout,
  createTransformedHandlersFn = createTransformedHandlers,
  attachGlobalRefListenersFn = attachGlobalRefListeners,
}) => {
  if (instance._globalListenersCleanup) {
    instance._globalListenersCleanup();
    instance._globalListenersCleanup = undefined;
  }

  cleanupEventRateLimitState({
    transformedHandlers: instance.transformedHandlers,
    clearTimerFn,
  });

  const runtimeDeps = syncRuntimeDeps(instance);
  instance.transformedHandlers = createTransformedHandlersFn({
    handlers: instance.handlers,
    deps: runtimeDeps,
  });

  instance._globalListenersCleanup = attachGlobalRefListenersFn({
    refs: instance.refs,
    handlers: instance.transformedHandlers,
    parseAndRenderFn,
    getPayloadContext: () => instance.viewData,
  });

  instance.render();
  return runtimeDeps;
};

export const runAttributeChangedComponentLifecycle = ({
  instance,
  attributeName,
  oldValue,
  newValue,
  scheduleFrameFn,
}) => {
  if (oldValue === newValue || !instance.render || instance[PARENT_UPDATE_TRANSACTION]) {
    return;
  }

  // The `isDirty` marker the runtime puts on a child it is updating
  // (web/componentUpdateHook.js) is not a prop change, even when the child
  // observes the name because it declares an `isDirty` prop.
  if (attributeName.toLowerCase() === "isdirty") {
    return;
  }

  // Browsers can invoke attributeChangedCallback before connectedCallback.
  // In that phase the component has no render target and transformed
  // handlers are not wired yet, so update handlers must not trigger render.
  if (instance.isConnected === false || !instance.renderTarget) {
    return;
  }

  if (instance.handlers?.handleOnUpdate) {
    const runtimeDeps = syncRuntimeDeps(instance);
    const changes = buildOnUpdateChanges({
      attributeName,
      oldValue,
      newValue,
      deps: runtimeDeps,
      propsSchemaKeys: instance._propsSchemaKeys,
      normalizeAttributeValue,
    });
    instance.handlers.handleOnUpdate(runtimeDeps, changes);
    return;
  }

  const mountGeneration = instance._mountGeneration;
  scheduleFrameFn(() => {
    if (instance.isConnected !== false && instance._mountGeneration === mountGeneration) {
      instance.render();
    }
  });
};

export const runPropChangedComponentLifecycle = ({
  instance,
  propName,
  oldValue,
  newValue,
  scheduleFrameFn,
}) => {
  if (oldValue === newValue || !instance.render || instance[PARENT_UPDATE_TRANSACTION]) {
    return;
  }

  if (instance.isConnected === false || !instance.renderTarget) {
    return;
  }

  if (instance.handlers?.handleOnUpdate) {
    const runtimeDeps = syncRuntimeDeps(instance);
    const changes = buildOnPropUpdateChanges({
      propName,
      oldValue,
      newValue,
      deps: runtimeDeps,
      propsSchemaKeys: instance._propsSchemaKeys,
    });
    instance.handlers.handleOnUpdate(runtimeDeps, changes);
    return;
  }

  const mountGeneration = instance._mountGeneration;
  scheduleFrameFn(() => {
    if (instance.isConnected !== false && instance._mountGeneration === mountGeneration) {
      instance.render();
    }
  });
};

// Instances that are patching right now, each with whether render() was
// called again during the patch.
const renderStates = new WeakMap();
const MAX_RENDER_PASSES = 10;

const patchComponent = ({
  instance,
  createComponentUpdateHookFn,
  // The web binding adopts prerendered markup on the first patch and
  // clears a render target a failed first patch left half built.
  prepareFirstPatchFn = ({ instance: target }) => target.renderTarget,
  resetRenderTargetFn = () => {},
  parseViewFn = parseView,
  collectRefElementsFn = collectRefElements,
  onError = (error) => {
    console.error("Error during render:", error);
  },
}) => {
  let isFirstPatch = false;
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
      isFirstPatch = true;
      instance._oldVNode = instance.patch(
        prepareFirstPatchFn({ instance, vDom }),
        vDom,
      );
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
    // A first patch that threw may have left part of a tree behind. Patching
    // the render target again would add the next tree beside it.
    if (isFirstPatch && !instance._oldVNode) {
      resetRenderTargetFn({ instance });
    }
    // Preserve _oldVNode so subsequent renders can still patch against
    // the last successful vdom tree. The component is not permanently broken.
    return instance._oldVNode || null;
  }
};

export const runRenderComponentLifecycle = (options) => {
  const { instance } = options;
  if (!instance.patch) {
    console.error("Patch function is not defined!");
    return null;
  }

  if (!instance.template) {
    console.error("Template is not defined!");
    return null;
  }

  // render() called while this instance is patching (a child it mounts
  // dispatches, or a focused element it moves or removes fires blur or
  // focusout) must not patch from the tree the running patch is replacing.
  // It runs as one more pass afterwards.
  const running = renderStates.get(instance);
  if (running) {
    running.requested = true;
    return instance._oldVNode || null;
  }

  const state = { requested: false };
  renderStates.set(instance, state);
  try {
    let passes = 0;
    let result;
    do {
      if (passes === MAX_RENDER_PASSES) {
        console.error(
          `[Render] ${instance.elementName} requested render during its own patch ${MAX_RENDER_PASSES} times; stopping`,
        );
        break;
      }
      passes += 1;
      state.requested = false;
      result = patchComponent(options);
    } while (state.requested);
    return result;
  } finally {
    renderStates.delete(instance);
  }
};
