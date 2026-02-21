import { describe, it, expect, vi } from "vitest";

import { createVirtualDom } from "../../src/parser.js";

const h = (tag, data = {}, children = []) => ({ tag, data, children });

const buildClickListener = ({
  eventConfig,
  handlers = {},
  selector = "button#submitButton",
  refKey = "submitButton",
}) => {
  const refs = {
    [refKey]: {
      eventListeners: {
        click: eventConfig,
      },
    },
  };

  const nodes = createVirtualDom({
    h,
    items: [{ [selector]: "Submit" }],
    refs,
    handlers,
    viewData: {},
  });

  return nodes[0]?.data?.on?.click;
};

const createEvent = ({ target, currentTarget } = {}) => {
  const resolvedTarget = target || { id: "target" };
  return {
    type: "click",
    target: resolvedTarget,
    currentTarget: currentTarget || resolvedTarget,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    stopImmediatePropagation: vi.fn(),
  };
};

describe("parser event modifiers", () => {
  it("applies once per target", () => {
    const calls = [];
    const click = buildClickListener({
      eventConfig: { handler: "handleSubmit", once: true },
      handlers: {
        handleSubmit: (payload) => {
          calls.push(payload._event.type);
        },
      },
    });

    const target = { id: "submitButton" };
    const event = createEvent({ target, currentTarget: target });

    click(event);
    click(event);

    expect(calls).toEqual(["click"]);
  });

  it("respects targetOnly guard", () => {
    const handler = vi.fn();
    const click = buildClickListener({
      eventConfig: { handler: "handleSubmit", targetOnly: true },
      handlers: { handleSubmit: handler },
    });

    click(createEvent({ target: { id: "child" }, currentTarget: { id: "parent" } }));

    expect(handler).not.toHaveBeenCalled();
  });

  it("applies preventDefault and stopImmediatePropagation before callback", () => {
    const handler = vi.fn();
    const click = buildClickListener({
      eventConfig: {
        handler: "handleSubmit",
        preventDefault: true,
        stopPropagation: true,
        stopImmediatePropagation: true,
      },
      handlers: { handleSubmit: handler },
    });

    const event = createEvent();
    click(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopImmediatePropagation).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("debounces event callbacks", () => {
    vi.useFakeTimers();

    const handler = vi.fn();
    const click = buildClickListener({
      eventConfig: { handler: "handleSubmit", debounce: 50 },
      handlers: { handleSubmit: handler },
    });

    click(createEvent());
    click(createEvent());
    click(createEvent());

    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(49);
    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(handler).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("throttles event callbacks", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const handler = vi.fn();
    const click = buildClickListener({
      eventConfig: { handler: "handleSubmit", throttle: 100 },
      handlers: { handleSubmit: handler },
    });

    click(createEvent());
    click(createEvent());
    expect(handler).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(50);
    click(createEvent());
    expect(handler).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(51);
    click(createEvent());
    expect(handler).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("injects _action and _event when dispatching store action listeners", () => {
    const handleCallStoreAction = vi.fn();
    const click = buildClickListener({
      eventConfig: {
        action: "setEmail",
        payload: {
          field: "email",
        },
      },
      handlers: {
        handleCallStoreAction,
      },
    });

    const event = createEvent();
    click(event);

    expect(handleCallStoreAction).toHaveBeenCalledTimes(1);
    expect(handleCallStoreAction).toHaveBeenCalledWith({
      field: "email",
      _event: event,
      _action: "setEmail",
    });
  });

  it("resolves handler payload expressions with _event context", () => {
    const handler = vi.fn();
    const click = buildClickListener({
      eventConfig: {
        handler: "handleSubmit",
        payload: {
          eventType: "${_event.type}",
        },
      },
      handlers: {
        handleSubmit: handler,
      },
    });

    const event = createEvent();
    click(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      eventType: "click",
      _event: event,
    });
  });

  it("throws clear error when action listener dispatcher is missing", () => {
    expect(() => buildClickListener({
      eventConfig: {
        action: "setEmail",
      },
      handlers: {},
    })).toThrow("requires handlers.handleCallStoreAction");
  });

  it("supports class-prefixed refs for event listeners", () => {
    const handler = vi.fn();
    const click = buildClickListener({
      selector: "button.label",
      refKey: ".label",
      eventConfig: { handler: "handleSubmit" },
      handlers: { handleSubmit: handler },
    });

    click(createEvent());

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
