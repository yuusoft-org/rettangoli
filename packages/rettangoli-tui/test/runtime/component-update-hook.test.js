import { describe, expect, it, vi } from "vitest";
import { createWebComponentUpdateHook } from "../../src/web/componentUpdateHook.js";

describe("createWebComponentUpdateHook", () => {
  it("schedules re-render and handleOnUpdate when props changed", () => {
    const scheduleFrame = vi.fn((callback) => callback());
    const updateHook = createWebComponentUpdateHook({ scheduleFrameFn: scheduleFrame });

    const render = vi.fn();
    const handleOnUpdate = vi.fn();
    const setAttribute = vi.fn();
    const removeAttribute = vi.fn();
    const dispatchEvent = vi.fn();
    const element = {
      deps: { marker: "ok" },
      store: { getState: () => ({}) },
      refIds: { submitButton: {} },
      handlers: { handleOnUpdate },
      render,
      setAttribute,
      removeAttribute,
      dispatchEvent,
    };

    updateHook.update(
      { data: { props: { value: "a" } } },
      { data: { props: { value: "b" } }, elm: element },
    );

    expect(scheduleFrame).toHaveBeenCalledTimes(1);
    expect(setAttribute).toHaveBeenCalledWith("isDirty", "true");
    expect(render).toHaveBeenCalledTimes(1);
    expect(removeAttribute).toHaveBeenCalledWith("isDirty");
    expect(handleOnUpdate).toHaveBeenCalledTimes(1);
    expect(handleOnUpdate.mock.calls[0][1]).toEqual({
      oldProps: { value: "a" },
      newProps: { value: "b" },
    });
  });

  it("does nothing when props are unchanged", () => {
    const scheduleFrame = vi.fn();
    const updateHook = createWebComponentUpdateHook({ scheduleFrameFn: scheduleFrame });
    const render = vi.fn();

    updateHook.update(
      { data: { props: { value: "a" } } },
      { data: { props: { value: "a" } }, elm: { render } },
    );

    expect(scheduleFrame).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });
});
