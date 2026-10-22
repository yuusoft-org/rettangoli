import { describe, expect, it, vi } from "vitest";

import { runRenderComponentLifecycle } from "../../src/core/runtime/componentOrchestrator.js";

const createInstance = ({ patch }) => ({
  patch,
  template: [],
  refs: {},
  refIds: {},
  viewData: {},
  renderTarget: { target: true },
  _snabbdomH: () => ({}),
});

describe("the first patch", () => {
  it("patches whatever prepareFirstPatchFn returns, once", () => {
    const patch = vi.fn((_old, next) => ({ ...next, patched: true }));
    const instance = createInstance({ patch });
    const serverVNode = { sel: "div", server: true };
    const prepareFirstPatchFn = vi.fn(() => serverVNode);
    const vDom = { sel: "div" };

    const run = () => runRenderComponentLifecycle({
      instance,
      prepareFirstPatchFn,
      parseViewFn: () => vDom,
      collectRefElementsFn: () => ({}),
    });
    run();
    run();

    expect(prepareFirstPatchFn).toHaveBeenCalledTimes(1);
    expect(prepareFirstPatchFn).toHaveBeenCalledWith({ instance, vDom });
    expect(patch.mock.calls[0][0]).toBe(serverVNode);
    expect(patch.mock.calls[1][0]).toEqual({ ...vDom, patched: true });
  });

  it("defaults to the render target", () => {
    const patch = vi.fn((_old, next) => next);
    const instance = createInstance({ patch });
    runRenderComponentLifecycle({
      instance,
      parseViewFn: () => ({ sel: "div" }),
      collectRefElementsFn: () => ({}),
    });
    expect(patch.mock.calls[0][0]).toBe(instance.renderTarget);
  });

  it("resets the render target when the first patch throws, so the next one starts clean", () => {
    const patch = vi.fn(() => {
      throw new Error("boom");
    });
    const instance = createInstance({ patch });
    const resetRenderTargetFn = vi.fn();
    const onError = vi.fn();

    const result = runRenderComponentLifecycle({
      instance,
      resetRenderTargetFn,
      onError,
      parseViewFn: () => ({ sel: "div" }),
      collectRefElementsFn: () => ({}),
    });

    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(resetRenderTargetFn).toHaveBeenCalledWith({ instance });
  });

  it("never resets after a later patch fails", () => {
    let calls = 0;
    const patch = vi.fn((_old, next) => {
      calls += 1;
      if (calls === 2) throw new Error("boom");
      return next;
    });
    const instance = createInstance({ patch });
    const resetRenderTargetFn = vi.fn();
    const options = {
      instance,
      resetRenderTargetFn,
      onError: () => {},
      parseViewFn: () => ({ sel: "div" }),
      collectRefElementsFn: () => ({}),
    };
    runRenderComponentLifecycle(options);
    runRenderComponentLifecycle(options);
    expect(resetRenderTargetFn).not.toHaveBeenCalled();
  });

  it("doesn't reset when the view itself fails before any patch", () => {
    const patch = vi.fn();
    const resetRenderTargetFn = vi.fn();
    runRenderComponentLifecycle({
      instance: createInstance({ patch }),
      resetRenderTargetFn,
      onError: () => {},
      parseViewFn: () => {
        throw new Error("bad view");
      },
    });
    expect(patch).not.toHaveBeenCalled();
    expect(resetRenderTargetFn).not.toHaveBeenCalled();
  });
});
