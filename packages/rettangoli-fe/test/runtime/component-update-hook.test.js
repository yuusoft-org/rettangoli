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

  it("coalesces queued mutations using the earliest old and latest new props", () => {
    const callbacks = [];
    const scheduleFrame = vi.fn((callback) => callbacks.push(callback));
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const options = [{ value: "one" }];
    const firstVnode = {
      data: { props: { options, phase: "initial" } },
      elm: element,
    };
    updateHook.insert(firstVnode);

    options.push({ value: "two" });
    const secondVnode = {
      data: { props: { options, phase: "middle" } },
      elm: element,
    };
    updateHook.update(firstVnode, secondVnode);

    options.push({ value: "three" });
    const thirdVnode = {
      data: { props: { options, phase: "latest" } },
      elm: element,
    };
    updateHook.update(secondVnode, thirdVnode);

    expect(scheduleFrame).toHaveBeenCalledTimes(1);
    expect(element.render).not.toHaveBeenCalled();
    expect(element.handlers.handleOnUpdate).not.toHaveBeenCalled();

    callbacks.shift()();

    expect(element.render).toHaveBeenCalledTimes(1);
    expect(element.handlers.handleOnUpdate).toHaveBeenCalledTimes(1);
    const firstPayload = element.handlers.handleOnUpdate.mock.calls[0][1];
    expect(firstPayload.oldProps.options).toEqual([{ value: "one" }]);
    expect(firstPayload.oldProps.phase).toBe("initial");
    expect(firstPayload.newProps).toBe(thirdVnode.data.props);
    expect(firstPayload.newProps.options).toEqual([
      { value: "one" },
      { value: "two" },
      { value: "three" },
    ]);
    expect(firstPayload.newProps.phase).toBe("latest");

    options.push({ value: "four" });
    const fourthVnode = {
      data: { props: { options, phase: "latest" } },
      elm: element,
    };
    updateHook.update(thirdVnode, fourthVnode);
    callbacks.shift()();

    expect(scheduleFrame).toHaveBeenCalledTimes(2);
    expect(element.render).toHaveBeenCalledTimes(2);
    expect(element.handlers.handleOnUpdate).toHaveBeenCalledTimes(2);
    const secondPayload = element.handlers.handleOnUpdate.mock.calls[1][1];
    expect(secondPayload.oldProps.options).toEqual([
      { value: "one" },
      { value: "two" },
      { value: "three" },
    ]);
    expect(secondPayload.newProps.options).toHaveLength(4);
  });

  it("defers snapshotting queued props until the scheduled frame", () => {
    const callbacks = [];
    const scheduleFrame = vi.fn((callback) => callbacks.push(callback));
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const firstVnode = {
      data: { props: { phase: "initial" } },
      elm: element,
    };
    updateHook.insert(firstVnode);

    const secondVnode = {
      data: { props: { phase: "middle" } },
      elm: element,
    };
    updateHook.update(firstVnode, secondVnode);

    let prototypeReads = 0;
    const latestContext = new Proxy(
      { projectId: "project-1" },
      {
        getPrototypeOf(target) {
          prototypeReads += 1;
          return Reflect.getPrototypeOf(target);
        },
      },
    );
    const latestVnode = {
      data: { props: { context: latestContext, phase: "latest" } },
      elm: element,
    };
    updateHook.update(secondVnode, latestVnode);

    expect(scheduleFrame).toHaveBeenCalledTimes(1);
    expect(prototypeReads).toBe(0);

    callbacks.shift()();

    expect(prototypeReads).toBeGreaterThan(0);
    expect(element.handlers.handleOnUpdate.mock.calls[0][1].newProps).toBe(
      latestVnode.data.props,
    );
  });

  it("refreshes the rendered baseline from live props when the frame runs", () => {
    const callbacks = [];
    const scheduleFrame = vi.fn((callback) => callbacks.push(callback));
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const options = [{ value: "one" }];
    const firstVnode = {
      data: { props: { options } },
      elm: element,
    };
    updateHook.insert(firstVnode);

    options.push({ value: "two" });
    const secondVnode = {
      data: { props: { options } },
      elm: element,
    };
    updateHook.update(firstVnode, secondVnode);

    // This mutation happens after the final parent hook but before its frame.
    options.push({ value: "three" });
    callbacks.shift()();

    expect(
      element.handlers.handleOnUpdate.mock.calls[0][1].newProps.options,
    ).toHaveLength(3);

    options.push({ value: "four" });
    const thirdVnode = {
      data: { props: { options } },
      elm: element,
    };
    updateHook.update(secondVnode, thirdVnode);
    callbacks.shift()();

    expect(
      element.handlers.handleOnUpdate.mock.calls[1][1].oldProps.options,
    ).toEqual([
      { value: "one" },
      { value: "two" },
      { value: "three" },
    ]);
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

  it("bounds stateful Proxy prototype walks and treats cycles as opaque", () => {
    let prototypeReads = 0;
    let context;
    context = new Proxy(
      {},
      {
        getPrototypeOf() {
          prototypeReads += 1;
          if (prototypeReads > 2) {
            throw new Error("prototype walk was not bounded");
          }
          return prototypeReads === 1 ? Object.prototype : context;
        },
      },
    );

    const callbacks = [];
    const scheduleFrame = vi.fn((callback) => callbacks.push(callback));
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const oldVnode = {
      data: { props: { context, disabled: false } },
      elm: element,
    };

    updateHook.insert(oldVnode);
    expect(prototypeReads).toBe(2);

    prototypeReads = 0;
    updateHook.update(oldVnode, {
      data: { props: { context, disabled: true } },
      elm: element,
    });

    expect(prototypeReads).toBe(2);

    prototypeReads = 0;
    callbacks.shift()();
    expect(prototypeReads).toBe(2);

    const payload = element.handlers.handleOnUpdate.mock.calls[0][1];
    expect(payload.oldProps.context).toBe(context);
    expect(payload.newProps.context).toBe(context);
  });

  it("compares Map props by reference", () => {
    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const oldContext = new Map([["projectId", "project-1"]]);
    const newContext = new Map([["projectId", "project-1"]]);
    const oldVnode = {
      data: { props: { context: oldContext } },
      elm: element,
    };
    updateHook.insert(oldVnode);

    updateHook.update(oldVnode, {
      data: { props: { context: newContext } },
      elm: element,
    });

    expect(scheduleFrame).toHaveBeenCalledTimes(1);
    const payload = element.handlers.handleOnUpdate.mock.calls[0][1];
    expect(payload.oldProps.context).toBe(oldContext);
    expect(payload.newProps.context).toBe(newContext);
    expect(payload.oldProps.context).toBeInstanceOf(Map);
    expect(payload.newProps.context).toBeInstanceOf(Map);
  });

  it("preserves custom class instances and their prototypes", () => {
    class Context {
      constructor(projectId) {
        this.projectId = projectId;
      }

      readProjectId() {
        return this.projectId;
      }
    }

    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const oldContext = new Context("project-1");
    const newContext = new Context("project-1");
    const oldVnode = {
      data: { props: { context: oldContext } },
      elm: element,
    };
    updateHook.insert(oldVnode);

    updateHook.update(oldVnode, {
      data: { props: { context: newContext } },
      elm: element,
    });

    const payload = element.handlers.handleOnUpdate.mock.calls[0][1];
    expect(payload.oldProps.context).toBe(oldContext);
    expect(payload.newProps.context).toBe(newContext);
    expect(payload.oldProps.context).toBeInstanceOf(Context);
    expect(payload.oldProps.context.readProjectId()).toBe("project-1");
  });

  it("does not clone a same-reference class instance after it mutates", () => {
    class Context {
      constructor(projectId) {
        this.projectId = projectId;
      }

      readProjectId() {
        return this.projectId;
      }
    }

    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const context = new Context("project-1");
    const oldVnode = {
      data: { props: { context, disabled: false } },
      elm: element,
    };
    updateHook.insert(oldVnode);

    context.projectId = "project-2";
    updateHook.update(oldVnode, {
      data: { props: { context, disabled: true } },
      elm: element,
    });

    const payload = element.handlers.handleOnUpdate.mock.calls[0][1];
    expect(payload.oldProps.context).toBe(context);
    expect(payload.newProps.context).toBe(context);
    expect(payload.oldProps.context).toBeInstanceOf(Context);
    expect(payload.oldProps.context.readProjectId()).toBe("project-2");
  });

  it("treats a plain record containing an opaque value as reference data", () => {
    class Model {
      constructor(value) {
        this.value = value;
      }
    }

    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({
      scheduleFrameFn: scheduleFrame,
    });
    const element = createManagedElement();
    const oldContext = { model: new Model("same") };
    const newContext = { model: new Model("same") };
    const oldVnode = {
      data: { props: { context: oldContext } },
      elm: element,
    };
    updateHook.insert(oldVnode);

    updateHook.update(oldVnode, {
      data: { props: { context: newContext } },
      elm: element,
    });

    expect(scheduleFrame).toHaveBeenCalledTimes(1);
    const payload = element.handlers.handleOnUpdate.mock.calls[0][1];
    expect(payload.oldProps.context).toBe(oldContext);
    expect(payload.newProps.context).toBe(newContext);
    expect(payload.oldProps.context.model).toBeInstanceOf(Model);
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
