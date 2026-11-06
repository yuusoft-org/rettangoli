import { describe, expect, it, vi } from "vitest";

import createGlobalUI from "../src/deps/createGlobalUI.js";

const ASYNC_METHODS = [
  "showAlert",
  "showConfirm",
  "showFormDialog",
  "showComponentDialog",
  "showDropdownMenu",
  "closeAll",
];

describe("createGlobalUI without an element", () => {
  for (const method of ASYNC_METHODS) {
    it(`${method} rejects with a message naming createGlobalUI`, async () => {
      const result = createGlobalUI(null)[method]({});

      await expect(result).rejects.toThrow(
        `globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUI before calling ${method}.`,
      );
    });
  }

  it("showToast throws synchronously with a message naming createGlobalUI", () => {
    expect(() => createGlobalUI(undefined).showToast({})).toThrow(
      "globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUI before calling showToast.",
    );
  });

  it("once and emit work without an element", () => {
    const globalUI = createGlobalUI(null);
    const callback = vi.fn();
    globalUI.once("closed", callback);

    globalUI.emit("closed", 1);
    globalUI.emit("closed", 2);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(1);
  });
});

describe("createGlobalUI with an element", () => {
  it("passes options to the element's handler and returns its result", async () => {
    const handlers = {
      handleShowAlert: vi.fn(async () => undefined),
      handleShowConfirm: vi.fn(async () => true),
      handleShowFormDialog: vi.fn(async () => ({ actionId: "submit" })),
      handleShowComponentDialog: vi.fn(async () => null),
      handleShowDropdownMenu: vi.fn(async () => ({ index: 0 })),
      handleShowToast: vi.fn(() => "ignored"),
      handleCloseAll: vi.fn(async () => undefined),
    };
    const globalUI = createGlobalUI({ transformedHandlers: handlers });
    const options = { message: "Hi" };

    await expect(globalUI.showConfirm(options)).resolves.toBe(true);
    await expect(globalUI.showFormDialog(options)).resolves.toEqual({ actionId: "submit" });
    await expect(globalUI.showDropdownMenu(options)).resolves.toEqual({ index: 0 });
    expect(globalUI.showToast(options)).toBeUndefined();
    await globalUI.showAlert(options);
    await globalUI.showComponentDialog(options);
    await globalUI.closeAll();

    for (const [name, handler] of Object.entries(handlers)) {
      expect(handler, name).toHaveBeenCalledTimes(1);
    }
    expect(handlers.handleShowConfirm).toHaveBeenCalledWith(options);
    expect(handlers.handleShowToast).toHaveBeenCalledWith(options);
    expect(handlers.handleCloseAll).toHaveBeenCalledWith();
  });
});
