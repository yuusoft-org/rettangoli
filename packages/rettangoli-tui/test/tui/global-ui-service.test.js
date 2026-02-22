import { describe, expect, it, vi } from "vitest";

import { createGlobalTuiService } from "../../src/tui/globalUiService.js";

const createKeyEvent = (name, extra = {}) => {
  return {
    name,
    key: extra.key || name,
    ctrlKey: Boolean(extra.ctrlKey),
    shiftKey: Boolean(extra.shiftKey),
    metaKey: Boolean(extra.metaKey),
    preventDefault: vi.fn(),
  };
};

describe("tui global ui service", () => {
  it("submits a dialog form using keyboard input", async () => {
    const requestRender = vi.fn();
    const service = createGlobalTuiService({ requestRender });

    const dialogPromise = service.api.dialog({
      form: {
        title: "Edit profile",
        fields: [
          {
            name: "name",
            type: "input-text",
            label: "Name",
          },
        ],
        actions: {
          buttons: [
            { id: "cancel", label: "Cancel" },
            { id: "save", label: "Save" },
          ],
        },
      },
      defaultValues: {
        name: "A",
      },
    });

    expect(service.isActive()).toBe(true);
    expect(service.renderOverlayCommands()).toContain("\u001b[s");

    const typeEvent = createKeyEvent("b", { key: "b" });
    service.handleKeyEvent(typeEvent);
    expect(typeEvent.preventDefault).toHaveBeenCalledTimes(1);

    const submitEvent = createKeyEvent("s", { key: "s", ctrlKey: true });
    service.handleKeyEvent(submitEvent);
    expect(submitEvent.preventDefault).toHaveBeenCalledTimes(1);

    const result = await dialogPromise;
    expect(result).toMatchObject({
      actionId: "save",
      values: {
        name: "Ab",
      },
    });
    expect(service.isActive()).toBe(false);
    expect(requestRender).toHaveBeenCalled();
  });

  it("cancels a dialog on escape", async () => {
    const service = createGlobalTuiService();
    const dialogPromise = service.api.dialog({
      form: {
        title: "Confirm",
      },
    });

    const escapeEvent = createKeyEvent("escape");
    service.handleKeyEvent(escapeEvent);

    await expect(dialogPromise).resolves.toBeNull();
    expect(service.isActive()).toBe(false);
  });

  it("keeps dialog open when validation fails, then submits when valid", async () => {
    const service = createGlobalTuiService();
    const dialogPromise = service.api.dialog({
      form: {
        title: "Create task",
        fields: [
          {
            name: "title",
            type: "input-text",
            label: "Title",
            required: true,
          },
        ],
        actions: {
          buttons: [
            { id: "save", label: "Save", validate: true },
          ],
        },
      },
    });

    service.handleKeyEvent(createKeyEvent("s", { key: "s", ctrlKey: true }));
    expect(service.isActive()).toBe(true);
    expect(service.renderOverlayCommands()).toContain("Required");

    service.handleKeyEvent(createKeyEvent("x", { key: "x" }));
    service.handleKeyEvent(createKeyEvent("s", { key: "s", ctrlKey: true }));

    await expect(dialogPromise).resolves.toMatchObject({
      actionId: "save",
      valid: true,
      errors: {},
      values: {
        title: "x",
      },
    });
    expect(service.isActive()).toBe(false);
  });

  it("queues dialog requests and resolves them sequentially", async () => {
    const service = createGlobalTuiService();

    const first = service.api.dialog({
      form: {
        title: "First",
      },
    });
    const second = service.api.dialog({
      form: {
        title: "Second",
      },
    });

    service.handleKeyEvent(createKeyEvent("enter"));
    await expect(first).resolves.toMatchObject({
      actionId: "ok",
    });

    expect(service.isActive()).toBe(true);
    service.handleKeyEvent(createKeyEvent("enter"));
    await expect(second).resolves.toMatchObject({
      actionId: "ok",
    });
    expect(service.isActive()).toBe(false);
  });

  it("treats selector aliases as select and keeps up/down for option changes", async () => {
    const service = createGlobalTuiService();

    const dialogPromise = service.api.dialog({
      form: {
        title: "Choose environment",
        fields: [
          {
            name: "environmentId",
            type: "input-selector",
            label: "Environment",
            options: [
              { value: "local", label: "Local" },
              { value: "staging", label: "Staging" },
            ],
          },
        ],
        actions: {
          buttons: [
            { id: "cancel", label: "Cancel" },
            { id: "save", label: "Save" },
          ],
        },
      },
      defaultValues: {
        environmentId: "local",
      },
    });

    service.handleKeyEvent(createKeyEvent("down"));
    service.handleKeyEvent(createKeyEvent("s", { key: "s", ctrlKey: true }));

    await expect(dialogPromise).resolves.toMatchObject({
      actionId: "save",
      values: {
        environmentId: "staging",
      },
    });
  });

  it("does not move focus into actions with up/down", async () => {
    const service = createGlobalTuiService();

    const dialogPromise = service.api.dialog({
      form: {
        title: "Input",
        fields: [
          {
            name: "value",
            type: "input-text",
            label: "Value",
          },
        ],
        actions: {
          buttons: [
            { id: "cancel", label: "Cancel" },
            { id: "save", label: "Save" },
          ],
        },
      },
      defaultValues: {
        value: "",
      },
    });

    service.handleKeyEvent(createKeyEvent("down"));
    service.handleKeyEvent(createKeyEvent("x", { key: "x" }));
    service.handleKeyEvent(createKeyEvent("s", { key: "s", ctrlKey: true }));

    await expect(dialogPromise).resolves.toMatchObject({
      actionId: "save",
      values: {
        value: "x",
      },
    });
  });

  it("does not move focus between fields with up/down", async () => {
    const service = createGlobalTuiService();

    const dialogPromise = service.api.dialog({
      form: {
        title: "Two fields",
        fields: [
          {
            name: "first",
            type: "input-text",
            label: "First",
          },
          {
            name: "second",
            type: "input-text",
            label: "Second",
          },
        ],
        actions: {
          buttons: [
            { id: "cancel", label: "Cancel" },
            { id: "save", label: "Save" },
          ],
        },
      },
      defaultValues: {
        first: "",
        second: "",
      },
    });

    service.handleKeyEvent(createKeyEvent("down"));
    service.handleKeyEvent(createKeyEvent("x", { key: "x" }));
    service.handleKeyEvent(createKeyEvent("s", { key: "s", ctrlKey: true }));

    await expect(dialogPromise).resolves.toMatchObject({
      actionId: "save",
      values: {
        first: "x",
        second: "",
      },
    });
  });
});
