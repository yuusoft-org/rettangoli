import { parseAndRender } from "jempl";
import { createEventDispatchCallback } from "../src/core/runtime/events.js";
import {
  buildOnUpdateChanges,
  createRuntimeDeps,
  createStoreActionDispatcher,
  createTransformedHandlers,
  ensureSyncBeforeMountResult,
  runAfterMount,
  runBeforeMount,
} from "../src/core/runtime/lifecycle.js";
import { normalizeAttributeValue } from "../src/core/runtime/props.js";

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

  if (scenario === "store_action_dispatcher_receives_rendered_payload") {
    let received = null;
    let renderCount = 0;

    const handlers = createTransformedHandlers({
      handlers: {},
      deps: {
        store: {
          setEmail: (payload) => {
            received = payload;
          },
        },
        render: () => {
          renderCount += 1;
        },
      },
    });
    const event = new CustomEvent("value-input", { detail: { value: "a@b.com ${typed}" } });
    const listener = createEventDispatchCallback({
      eventConfig: {
        action: "setEmail",
        payload: { value: "${_event.detail.value}", label: "${label}" },
      },
      handlers,
      parseAndRenderFn: parseAndRender,
      getPayloadContext: () => ({ label: "Costs ${price}" }),
    });

    listener(event);

    return {
      value: received.value,
      label: received.label,
      eventIsSame: received._event === event,
      action: received._action,
      renderCount,
    };
  }

  if (scenario === "store_action_dispatcher_rejects_missing_action") {
    const dispatch = createStoreActionDispatcher({
      store: {},
      render: () => {},
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
      normalizeAttributeValue,
    });

    return {
      hasMaxItems: Object.prototype.hasOwnProperty.call(changes.newProps, "maxItems"),
      oldValue: changes.oldProps.maxItems,
    };
  }

  throw new Error(`Unknown lifecycle core scenario '${scenario}'.`);
};
