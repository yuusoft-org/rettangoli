import { createConfiguredEventListener } from "../src/core/runtime/events.js";
import { parseAndRender } from "jempl";

const createEvent = ({
  type = "click",
  target = { id: "target" },
  currentTarget = target,
} = {}) => {
  return {
    type,
    target,
    currentTarget,
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
  };
};

export const runEventsCoreCase = ({ scenario }) => {
  if (scenario === "handler_payload_injection") {
    const calls = [];
    const listener = createConfiguredEventListener({
      eventType: "click",
      eventConfig: {
        handler: "handleSubmit",
        payload: {
          source: "button",
        },
      },
      refKey: "submitButton",
      handlers: {
        handleSubmit: (payload) => {
          calls.push(payload);
        },
      },
      eventRateLimitState: new Map(),
      stateKey: "submitButton:click",
    });

    listener(createEvent({ type: "click" }));

    return {
      called: calls.length,
      source: calls[0]?.source,
      hasEvent: Boolean(calls[0]?._event),
    };
  }

  if (scenario === "handler_payload_expression_resolution") {
    const calls = [];
    const listener = createConfiguredEventListener({
      eventType: "click",
      eventConfig: {
        handler: "handleSubmit",
        payload: {
          eventType: "${_event.type}",
        },
      },
      refKey: "submitButton",
      handlers: {
        handleSubmit: (payload) => {
          calls.push(payload);
        },
      },
      eventRateLimitState: new Map(),
      stateKey: "submitButton:click",
      parseAndRenderFn: parseAndRender,
    });

    listener(createEvent({ type: "click" }));

    return {
      called: calls.length,
      eventType: calls[0]?.eventType,
      hasEvent: Boolean(calls[0]?._event),
    };
  }

  if (scenario === "action_payload_injection") {
    const calls = [];
    const listener = createConfiguredEventListener({
      eventType: "click",
      eventConfig: {
        action: "setEmail",
        payload: {
          field: "email",
        },
      },
      refKey: "submitButton",
      handlers: {
        handleCallStoreAction: (payload) => {
          calls.push(payload);
        },
      },
      eventRateLimitState: new Map(),
      stateKey: "submitButton:click",
    });

    listener(createEvent({ type: "click" }));

    return {
      called: calls.length,
      field: calls[0]?.field,
      action: calls[0]?._action,
      hasEvent: Boolean(calls[0]?._event),
    };
  }

  if (scenario === "action_requires_dispatcher") {
    createConfiguredEventListener({
      eventType: "click",
      eventConfig: {
        action: "setEmail",
      },
      refKey: "submitButton",
      handlers: {},
      eventRateLimitState: new Map(),
      stateKey: "submitButton:click",
    });
    return true;
  }

  if (scenario === "target_only_guard") {
    let called = 0;
    const listener = createConfiguredEventListener({
      eventType: "click",
      eventConfig: {
        handler: "handleSubmit",
        targetOnly: true,
      },
      refKey: "submitButton",
      handlers: {
        handleSubmit: () => {
          called += 1;
        },
      },
      eventRateLimitState: new Map(),
      stateKey: "submitButton:click",
    });

    listener(createEvent({
      target: { id: "child" },
      currentTarget: { id: "parent" },
    }));

    return {
      called,
    };
  }

  if (scenario === "once_per_target") {
    let called = 0;
    const target = { id: "submitButton" };
    const listener = createConfiguredEventListener({
      eventType: "click",
      eventConfig: {
        handler: "handleSubmit",
        once: true,
      },
      refKey: "submitButton",
      handlers: {
        handleSubmit: () => {
          called += 1;
        },
      },
      eventRateLimitState: new Map(),
      stateKey: "submitButton:click",
    });

    listener(createEvent({ target, currentTarget: target }));
    listener(createEvent({ target, currentTarget: target }));

    return {
      called,
    };
  }

  if (scenario === "debounce_trailing_only") {
    let called = 0;
    let timer = null;
    let timerId = 0;
    let clearCalls = 0;
    const listener = createConfiguredEventListener({
      eventType: "click",
      eventConfig: {
        handler: "handleSubmit",
        debounce: 100,
      },
      refKey: "submitButton",
      handlers: {
        handleSubmit: () => {
          called += 1;
        },
      },
      eventRateLimitState: new Map(),
      stateKey: "submitButton:click",
      setTimeoutFn: (callback) => {
        timerId += 1;
        timer = {
          id: timerId,
          callback,
        };
        return timer.id;
      },
      clearTimeoutFn: (id) => {
        clearCalls += 1;
        if (timer && timer.id === id) {
          timer = null;
        }
      },
    });

    listener(createEvent({ type: "click" }));
    listener(createEvent({ type: "click" }));

    const calledBeforeFlush = called;
    timer?.callback();

    return {
      calledBeforeFlush,
      calledAfterFlush: called,
      clearCalls,
    };
  }

  if (scenario === "throttle_leading_only") {
    let called = 0;
    let now = 0;
    const listener = createConfiguredEventListener({
      eventType: "click",
      eventConfig: {
        handler: "handleSubmit",
        throttle: 100,
      },
      refKey: "submitButton",
      handlers: {
        handleSubmit: () => {
          called += 1;
        },
      },
      eventRateLimitState: new Map(),
      stateKey: "submitButton:click",
      nowFn: () => now,
    });

    listener(createEvent({ type: "click" }));
    listener(createEvent({ type: "click" }));
    now = 50;
    listener(createEvent({ type: "click" }));
    now = 101;
    listener(createEvent({ type: "click" }));

    return {
      called,
    };
  }

  if (scenario === "debounce_clears_timer_on_callback_error") {
    let timer = null;
    let timerId = 0;
    const listener = createConfiguredEventListener({
      eventType: "click",
      eventConfig: {
        handler: "handleSubmit",
        debounce: 100,
      },
      refKey: "submitButton",
      handlers: {
        handleSubmit: () => {
          throw new Error("handler exploded");
        },
      },
      eventRateLimitState: new Map(),
      stateKey: "submitButton:click",
      setTimeoutFn: (callback) => {
        timerId += 1;
        timer = { id: timerId, callback };
        return timer.id;
      },
      clearTimeoutFn: (id) => {
        if (timer && timer.id === id) {
          timer = null;
        }
      },
    });

    listener(createEvent({ type: "click" }));

    let threw = false;
    try {
      timer?.callback();
    } catch (_e) {
      threw = true;
    }

    // After the error, timer ref should be cleared (null) so next event starts fresh
    return {
      threw,
      timerCleared: timer === null || timer?.callback === undefined,
    };
  }

  throw new Error(`Unknown events core scenario '${scenario}'.`);
};
