import {
  buildOnUpdateChanges,
  createRuntimeDeps,
  createStoreActionDispatcher,
  createTransformedHandlers,
  ensureSyncBeforeMountResult,
  runAfterMount,
  runBeforeMount,
} from "../src/core/runtime/lifecycle.js";
import { normalizeAttributeValue, toCamelCase } from "../src/core/runtime/props.js";

export const runLifecycleCoreCase = ({ scenario }) => {
  if (scenario === "create_runtime_deps_merges_fields") {
    const deps = createRuntimeDeps({
      baseDeps: { a: 1 },
      refs: { submitButton: { id: "submitButton" } },
      dispatchEvent: () => true,
      store: { setTitle: () => {} },
      render: () => {},
    });

    return {
      hasA: deps.a === 1,
      hasRefs: typeof deps.refs === "object",
      hasDispatchEvent: typeof deps.dispatchEvent === "function",
      hasStore: typeof deps.store === "object",
      hasRender: typeof deps.render === "function",
    };
  }

  if (scenario === "store_action_dispatcher_injects_event_context") {
    let received = null;
    let renderCount = 0;

    const dispatch = createStoreActionDispatcher({
      store: {
        setEmail: (ctx) => {
          received = ctx;
        },
      },
      render: () => {
        renderCount += 1;
      },
      parseAndRenderFn: (payload, scope) => ({
        value: payload.value,
        _event: scope._event,
      }),
    });

    dispatch({
      _action: "setEmail",
      value: "a@b.com",
      _event: { type: "input" },
    });

    return {
      value: received.value,
      eventType: received._event.type,
      renderCount,
    };
  }

  if (scenario === "store_action_dispatcher_rejects_missing_action") {
    const dispatch = createStoreActionDispatcher({
      store: {},
      render: () => {},
      parseAndRenderFn: (payload) => payload,
    });

    dispatch({
      _action: "missingAction",
      _event: { type: "click" },
    });

    return true;
  }

  if (scenario === "transformed_handlers_wrap_user_handlers") {
    const transformed = createTransformedHandlers({
      handlers: {
        handleClick: (_deps, payload) => payload.value * 2,
      },
      deps: {
        store: {},
        render: () => {},
      },
      parseAndRenderFn: (payload) => payload,
    });

    return {
      result: transformed.handleClick({ value: 3 }),
      hasStoreActionDispatcher: typeof transformed.handleCallStoreAction === "function",
    };
  }

  if (scenario === "before_mount_rejects_promise") {
    ensureSyncBeforeMountResult(Promise.resolve());
    return true;
  }

  if (scenario === "run_before_mount_returns_cleanup") {
    const cleanup = runBeforeMount({
      handlers: {
        handleBeforeMount: () => () => {},
      },
      deps: {},
    });

    return {
      isFunction: typeof cleanup === "function",
    };
  }

  if (scenario === "run_after_mount_invokes_handler") {
    let called = false;
    runAfterMount({
      handlers: {
        handleAfterMount: () => {
          called = true;
        },
      },
      deps: {},
    });

    return {
      called,
    };
  }

  if (scenario === "build_on_update_changes_normalizes_names") {
    const changes = buildOnUpdateChanges({
      attributeName: "max-items",
      oldValue: "1",
      newValue: "2",
      deps: {
        props: {
          maxItems: "2",
          title: "hello",
        },
      },
      propsSchemaKeys: ["maxItems", "title"],
      toCamelCase,
      normalizeAttributeValue,
    });

    return {
      changedProp: changes.changedProp,
      oldValue: changes.oldProps.maxItems,
      newValue: changes.newProps.maxItems,
      title: changes.newProps.title,
    };
  }

  if (scenario === "build_on_update_changes_removes_missing_new_value") {
    const changes = buildOnUpdateChanges({
      attributeName: "max-items",
      oldValue: "1",
      newValue: null,
      deps: {
        props: {
          title: "hello",
        },
      },
      propsSchemaKeys: ["maxItems", "title"],
      toCamelCase,
      normalizeAttributeValue,
    });

    return {
      hasMaxItems: Object.prototype.hasOwnProperty.call(changes.newProps, "maxItems"),
      oldValue: changes.oldProps.maxItems,
    };
  }

  throw new Error(`Unknown lifecycle core scenario '${scenario}'.`);
};
