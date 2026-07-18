import { describe, expect, it, vi } from "vitest";
import {
  createWebComponentUpdateHook,
  RETTANGOLI_COMPONENT_MARKER,
} from "../../src/web/componentUpdateHook.js";

const createManagedElement = (overrides = {}) => ({
  [RETTANGOLI_COMPONENT_MARKER]: true,
  deps: { marker: "ok" },
  store: { getState: () => ({}) },
  refIds: { submitButton: {} },
  handlers: { handleOnUpdate: vi.fn() },
  render: vi.fn(),
  setAttribute: vi.fn(),
  removeAttribute: vi.fn(),
  dispatchEvent: vi.fn(),
  ...overrides,
});

describe("createWebComponentUpdateHook", () => {
  it("uses a stable cross-bundle component marker", () => {
    expect(RETTANGOLI_COMPONENT_MARKER).toBe(
      Symbol.for("@rettangoli/fe/component"),
    );
  });

  it("recognizes pre-brand components built by an older FE bundle", () => {
    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    delete element[RETTANGOLI_COMPONENT_MARKER];
    element.elementName = "rtgl-select";
    element.patch = vi.fn();
    element._snabbdomH = vi.fn();
    element.props = {};
    element.deps = {
      render: element.render,
      store: element.store,
      props: element.props,
    };
    const options = [{ value: "old" }];
    const oldVnode = {
      data: { props: { options } },
      elm: element,
    };
    updateHook.insert(oldVnode);

    options.push({ value: "new" });
    updateHook.update(oldVnode, {
      data: { props: { options } },
      elm: element,
    });

    expect(scheduleFrame).toHaveBeenCalledTimes(1);
    expect(element.render).toHaveBeenCalledTimes(1);
    expect(
      element.handlers.handleOnUpdate.mock.calls[0][1].oldProps.options,
    ).toEqual([{ value: "old" }]);
  });

  it("schedules re-render and handleOnUpdate when props changed", () => {
    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();

    updateHook.update(
      { data: { props: { value: "a" } } },
      { data: { props: { value: "b" } }, elm: element },
    );

    expect(scheduleFrame).toHaveBeenCalledTimes(1);
    expect(element.setAttribute).toHaveBeenCalledWith("isDirty", "true");
    expect(element.render).toHaveBeenCalledTimes(1);
    expect(element.removeAttribute).toHaveBeenCalledWith("isDirty");
    expect(element.handlers.handleOnUpdate).toHaveBeenCalledTimes(1);
    expect(element.handlers.handleOnUpdate.mock.calls[0][1]).toEqual({
      oldProps: { value: "a" },
      newProps: { value: "b" },
    });
  });

  it("does nothing when props are unchanged", () => {
    const scheduleFrame = vi.fn();
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();

    updateHook.update(
      { data: { props: { value: "a" } } },
      { data: { props: { value: "a" } }, elm: element },
    );

    expect(scheduleFrame).not.toHaveBeenCalled();
    expect(element.render).not.toHaveBeenCalled();
  });

  it("detects in-place mutations to JSON-data props", () => {
    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const options = [
      { value: "one", label: "One" },
      { value: "two", label: "Two" },
    ];
    const oldVnode = {
      data: { props: { options } },
      elm: element,
    };
    updateHook.insert(oldVnode);

    options.push(
      { value: "three", label: "Three" },
      { value: "four", label: "Four" },
    );
    updateHook.update(oldVnode, {
      data: { props: { options } },
      elm: element,
    });

    expect(scheduleFrame).toHaveBeenCalledTimes(1);
    const payload = element.handlers.handleOnUpdate.mock.calls[0][1];
    expect(payload.oldProps.options).toEqual([
      { value: "one", label: "One" },
      { value: "two", label: "Two" },
    ]);
    expect(payload.oldProps.options).not.toBe(options);
    expect(payload.newProps.options).toBe(options);
    expect(payload.newProps.options).toHaveLength(4);
  });

  it("preserves references for props unchanged by an in-place mutation", () => {
    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const options = [{ value: "bug", label: "Bug" }];
    const selectedValues = ["bug"];
    const context = { projectId: "project-1" };
    context.self = context;
    const oldVnode = {
      data: { props: { options, selectedValues, context } },
      elm: element,
    };
    updateHook.insert(oldVnode);

    options.push({ value: "platform", label: "Platform" });
    updateHook.update(oldVnode, {
      data: { props: { options, selectedValues, context } },
      elm: element,
    });

    const payload = element.handlers.handleOnUpdate.mock.calls[0][1];
    expect(payload.oldProps.selectedValues).toBe(selectedValues);
    expect(payload.newProps.selectedValues).toBe(selectedValues);
    expect(payload.oldProps.context).toBe(context);
    expect(payload.newProps.context).toBe(context);
  });

  it("refreshes the baseline after a structurally equal replacement", () => {
    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const firstOptions = [{ value: "one" }];
    const firstVnode = {
      data: { props: { options: firstOptions } },
      elm: element,
    };
    updateHook.insert(firstVnode);

    const nextOptions = [{ value: "one" }];
    const nextVnode = {
      data: { props: { options: nextOptions } },
      elm: element,
    };
    updateHook.update(firstVnode, nextVnode);
    expect(scheduleFrame).not.toHaveBeenCalled();

    nextOptions.push({ value: "two" });
    updateHook.update(nextVnode, {
      data: { props: { options: nextOptions } },
      elm: element,
    });

    expect(scheduleFrame).toHaveBeenCalledTimes(1);
    expect(
      element.handlers.handleOnUpdate.mock.calls[0][1].oldProps.options,
    ).toEqual([{ value: "one" }]);
  });

  it("retains exact old and new references for a deep-equal replacement", () => {
    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const oldOptions = [{ value: "one" }];
    const newOptions = [{ value: "one" }];
    const oldVnode = {
      data: { props: { options: oldOptions, disabled: false } },
      elm: element,
    };
    updateHook.insert(oldVnode);

    updateHook.update(oldVnode, {
      data: { props: { options: newOptions, disabled: true } },
      elm: element,
    });

    const payload = element.handlers.handleOnUpdate.mock.calls[0][1];
    expect(payload.oldProps.options).toBe(oldOptions);
    expect(payload.newProps.options).toBe(newOptions);
  });

  it("reports the rendered value when a prop is mutated and then replaced", () => {
    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const oldOptions = [{ value: "rendered" }];
    const oldVnode = {
      data: { props: { options: oldOptions } },
      elm: element,
    };
    updateHook.insert(oldVnode);

    oldOptions.push({ value: "never-rendered" });
    const newOptions = [{ value: "replacement" }];
    updateHook.update(oldVnode, {
      data: { props: { options: newOptions } },
      elm: element,
    });

    const payload = element.handlers.handleOnUpdate.mock.calls[0][1];
    expect(payload.oldProps.options).toEqual([{ value: "rendered" }]);
    expect(payload.oldProps.options).not.toBe(oldOptions);
    expect(payload.newProps.options).toBe(newOptions);
  });

  it("supports BigInt props during insertion and updates", () => {
    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const oldVnode = {
      data: { props: { selectedValue: 1n } },
      elm: element,
    };

    expect(() => updateHook.insert(oldVnode)).not.toThrow();
    updateHook.update(oldVnode, {
      data: { props: { selectedValue: 2n } },
      elm: element,
    });

    expect(scheduleFrame).toHaveBeenCalledTimes(1);
    expect(element.handlers.handleOnUpdate.mock.calls[0][1]).toEqual({
      oldProps: { selectedValue: 1n },
      newProps: { selectedValue: 2n },
    });
  });

  it("supports circular props and preserves their identity", () => {
    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const context = { projectId: "project-1" };
    context.self = context;
    const oldVnode = {
      data: { props: { context, disabled: false } },
      elm: element,
    };

    expect(() => updateHook.insert(oldVnode)).not.toThrow();
    updateHook.update(oldVnode, {
      data: { props: { context, disabled: true } },
      elm: element,
    });

    const payload = element.handlers.handleOnUpdate.mock.calls[0][1];
    expect(payload.oldProps.context).toBe(context);
    expect(payload.newProps.context).toBe(context);
    expect(payload.oldProps.disabled).toBe(false);
    expect(payload.newProps.disabled).toBe(true);
  });

  it("preserves opaque prop identities when another prop changes", () => {
    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const callback = () => {};
    const createdAt = new Date("2026-07-18T00:00:00.000Z");
    const oldVnode = {
      data: { props: { callback, createdAt, value: "old" } },
      elm: element,
    };
    updateHook.insert(oldVnode);

    updateHook.update(oldVnode, {
      data: { props: { callback, createdAt, value: "new" } },
      elm: element,
    });

    const payload = element.handlers.handleOnUpdate.mock.calls[0][1];
    expect(payload.oldProps.callback).toBe(callback);
    expect(payload.newProps.callback).toBe(callback);
    expect(payload.oldProps.createdAt).toBe(createdAt);
    expect(payload.newProps.createdAt).toBe(createdAt);
  });

  it("does not inspect or update unrelated custom elements", () => {
    const scheduleFrame = vi.fn();
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const render = vi.fn();
    const props = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("foreign props were inspected");
        },
      },
    );
    const oldVnode = { data: { props }, elm: { render } };
    const nextVnode = { data: { props }, elm: oldVnode.elm };

    expect(() => updateHook.insert(oldVnode)).not.toThrow();
    expect(() => updateHook.update(oldVnode, nextVnode)).not.toThrow();
    expect(scheduleFrame).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });
});
