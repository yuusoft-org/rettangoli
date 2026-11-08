// @vitest-environment jsdom
//
// rtgl-form renders the form once per handler and reuses it after render().
// That is only right while the form is rendered after the handler has stored the
// new value (and, on update, after hidden values are pruned): these cases fail
// if that render moves earlier. Templates use plain variable references because
// jempl drops comparison interpolations such as `${a == 'b'}`.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  defineComponents,
  definePrimitives,
  flush,
  installTimers,
  mountForm,
  removeTimers,
  setChecked,
  typeInto,
} from "./support/mountComponent.js";

beforeAll(async () => {
  await definePrimitives();
  await defineComponents(["form", "select"]);
});
beforeEach(installTimers);
afterEach(removeTimers);

describe("rtgl-form: attributes follow the values a handler just stored", () => {
  it("disables a field whose disabled template reads the checkbox that changed", async () => {
    const { field } = await mountForm({
      fields: [
        { name: "lock", type: "checkbox", label: "Lock" },
        { name: "note", type: "input-text", disabled: "${lock}" },
      ],
    });
    expect(field("note").hasAttribute("disabled")).toBe(false);
    setChecked(field("lock"), true);
    await flush();
    expect(field("note").hasAttribute("disabled")).toBe(true);
    setChecked(field("lock"), false);
    await flush();
    expect(field("note").hasAttribute("disabled")).toBe(false);
  });

  it("disables a field while typing makes its disabled template true", async () => {
    const { field } = await mountForm({
      fields: [
        { name: "code", type: "input-text" },
        { name: "note", type: "input-text", disabled: "${code}" },
      ],
    });
    typeInto(field("code"), "x");
    await flush();
    expect(field("note").hasAttribute("disabled")).toBe(true);
  });

  it("re-reads templates after a context change prunes the value they read", async () => {
    const { host, field } = await mountForm(
      {
        fields: [
          { name: "mode", type: "select", $when: "!locked", options: [{ label: "A", value: "a" }] },
          { name: "note", type: "input-text", disabled: "${mode}" },
        ],
      },
      { mode: "a" },
    );
    expect(field("note").hasAttribute("disabled")).toBe(true);
    host.context = { locked: true };
    await flush();
    expect(host.getValues()).not.toHaveProperty("mode");
    expect(field("note").hasAttribute("disabled")).toBe(false);
  });
});
