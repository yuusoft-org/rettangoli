// @vitest-environment jsdom
//
// Whitespace-only text in required fields of a mounted rtgl-form: when it is
// reported (same moments as any other error) and that the values keep it.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  defineComponents,
  definePrimitives,
  flush,
  installTimers,
  mountForm,
  readDisplayed,
  removeTimers,
  typeInto,
} from "./support/mountComponent.js";

beforeAll(async () => {
  await definePrimitives();
  await defineComponents(["form", "popover-input", "select"]);
});
beforeEach(installTimers);
afterEach(removeTimers);

const REQUIRED = "This field is required";
const form = {
  fields: [
    { name: "title", type: "input-text", label: "Title", required: true },
    { name: "notes", type: "input-textarea", required: { message: "Write a note" } },
    { name: "nick", type: "popover-input", label: "Nick", required: true },
    {
      name: "sep",
      type: "select",
      required: true,
      options: [{ label: "Blank", value: " " }, { label: "Comma", value: "," }],
    },
    { name: "optional", type: "input-text" },
  ],
  actions: {
    buttons: [
      { id: "save", label: "Save", validate: true },
      { id: "draft", label: "Save draft" },
    ],
  },
};
const blank = { title: "   ", notes: " \n\t", nick: " ", sep: " ", optional: "　" };
const alerts = (host) =>
  [...host.shadowRoot.querySelectorAll("rtgl-text[role=alert]")].map((text) => text.textContent);

describe("rtgl-form mount: required and whitespace-only text", () => {
  it("shows no error before a validation", async () => {
    const { host, field } = await mountForm(form, blank);

    typeInto(field("title"), "  ");
    await flush();

    expect(alerts(host)).toEqual([]);
  });

  it("a validating action reports the text fields and submits the values untrimmed", async () => {
    const { host, events, field } = await mountForm(form, blank);

    host.shadowRoot.querySelector("#action0").click();
    await flush();

    expect(events).toEqual([
      [
        "form-action",
        {
          actionId: "save",
          values: blank,
          valid: false,
          errors: { title: REQUIRED, notes: "Write a note", nick: REQUIRED },
        },
      ],
    ]);
    expect(alerts(host)).toEqual([REQUIRED, "Write a note", REQUIRED]);
    expect(host.getValues()).toEqual(blank);
    expect(readDisplayed(field("title"))).toBe("   ");
    expect(field("title").getAttribute("aria-invalid")).toBe("true");
    expect(field("sep").getAttribute("aria-invalid")).not.toBe("true");
  });

  it("an action without validate still passes whitespace through", async () => {
    const { host, events } = await mountForm(form, blank);

    host.shadowRoot.querySelector("#action1").click();
    await flush();

    expect(events).toEqual([["form-action", { actionId: "draft", values: blank }]]);
    expect(alerts(host)).toEqual([]);
  });

  it("validate() reports them and leaves the values untrimmed", async () => {
    const { host } = await mountForm(form, blank);

    expect(host.validate()).toEqual({
      valid: false,
      errors: { title: REQUIRED, notes: "Write a note", nick: REQUIRED },
    });
    expect(host.getValues()).toEqual(blank);
  });

  it("after a failed validation, typing updates the error as the text gains or loses content", async () => {
    const { host, events, field } = await mountForm(form, { ...blank, notes: "n", nick: "k" });
    host.validate();
    await flush();
    expect(alerts(host)).toEqual([REQUIRED]);

    typeInto(field("title"), "  a ");
    await flush();
    expect(alerts(host)).toEqual([]);
    expect(events.at(-1)).toEqual([
      "form-input",
      { name: "title", value: "  a ", values: { ...blank, title: "  a ", notes: "n", nick: "k" } },
    ]);

    typeInto(field("title"), " \t ");
    await flush();
    expect(alerts(host)).toEqual([REQUIRED]);
    expect(host.getValues().title).toBe(" \t ");

    typeInto(field("notes"), "\n\n");
    await flush();
    expect(alerts(host)).toEqual([REQUIRED, "Write a note"]);
  });

  it("passes with text around the whitespace and submits it as typed", async () => {
    const values = { title: " a ", notes: "\nb\n", nick: " c", sep: " ", optional: "" };
    const { host, events } = await mountForm(form, values);

    host.shadowRoot.querySelector("#action0").click();
    await flush();

    expect(events).toEqual([
      ["form-action", { actionId: "save", values, valid: true, errors: {} }],
    ]);
  });

  it("setValues with whitespace keeps it and fails the next validation", async () => {
    const { host } = await mountForm(form, { title: "ok", notes: "ok", nick: "ok", sep: "," });
    expect(host.validate().valid).toBe(true);

    host.setValues({ values: { title: "　　" } });
    await flush();

    expect(host.getValues().title).toBe("　　");
    expect(host.validate()).toEqual({ valid: false, errors: { title: REQUIRED } });
  });
});
