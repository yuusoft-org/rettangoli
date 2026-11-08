import { beforeEach, describe, expect, it, vi } from "vitest";

// Count the whole-form renders, to show that a form which renders today
// takes the same single render and never reaches the fallback.
vi.mock("jempl", async (importOriginal) => {
  const jempl = await importOriginal();
  return { ...jempl, parseAndRender: vi.fn(jempl.parseAndRender) };
});

const { parseAndRender } = await import("jempl");
const { selectForm } = await import("../src/components/form/form.store.js");
const { escapeFormText } = await import("../src/common/formText.js");

const WORD_JOINER = "\u2060";

const labelOf = (label, context) =>
  selectForm({
    state: { formValues: {} },
    props: {
      form: { fields: [{ name: "a", type: "input-text", label }] },
      ...(context ? { context } : {}),
    },
  }).fields[0].label;

beforeEach(() => {
  parseAndRender.mockClear();
});

describe("rtgl-form templating of definition strings", () => {
  it.each([
    ["a #{b} c", `a #${WORD_JOINER}{b} c`],
    ["Total ${a + b}", `Total $${WORD_JOINER}{a + b}`],
    ["${x || y}", `$${WORD_JOINER}{x || y}`],
    ["Call ${foo()}", `Call $${WORD_JOINER}{foo()}`],
  ])("shows %j as text instead of failing to render", (label, shown) => {
    expect(labelOf(label)).toBe(shown);
  });

  it("escapes only the strings that fail and keeps rendering the others", () => {
    const form = selectForm({
      state: { formValues: { name: "Ann" } },
      props: {
        context: { scene: "Intro" },
        form: {
          title: "Edit ${scene}",
          fields: [
            { name: "name", type: "input-text", label: "Name of ${name}" },
            {
              name: "move",
              type: "select",
              options: [
                { label: "Scene #{1}", value: "s1" },
                { label: "To ${scene}", value: "s2" },
              ],
            },
          ],
        },
      },
    });

    expect(form.title).toBe("Edit Intro");
    expect(form.fields[0].label).toBe("Name of Ann");
    expect(form.fields[1].options).toEqual([
      { label: `Scene #${WORD_JOINER}{1}`, value: "s1" },
      { label: "To Intro", value: "s2" },
    ]);
  });

  it("renders a form that renders today with one render and unchanged output", () => {
    expect(labelOf("${user.name}", { user: { name: "Ann" } })).toBe("Ann");
    expect(labelOf("Price ${amount}")).toBe("Price ");
    expect(labelOf("${")).toBe("${");
    expect(labelOf("${unclosed")).toBe("${unclosed");
    expect(parseAndRender).toHaveBeenCalledTimes(4);
  });

  it("keeps $for loops and $when conditions working when another string is escaped", () => {
    const form = selectForm({
      state: { formValues: { mode: "on" } },
      props: {
        context: { names: ["x", "y"] },
        form: {
          fields: [
            { name: "mode", type: "input-text", label: "Mode #{m}" },
            { "$for n, i in names": { name: "${n}", type: "input-text", label: "${i}" } },
            { name: "extra", type: "input-text", label: "Extra", $when: "mode == 'on'" },
            { name: "hidden", type: "input-text", label: "Hidden", $when: "mode == 'off'" },
          ],
        },
      },
    });

    expect(form.fields.map((field) => [field.name, field.label])).toEqual([
      ["mode", `Mode #${WORD_JOINER}{m}`],
      ["x", 0],
      ["y", 1],
      ["extra", "Extra"],
    ]);
  });

  it("keeps #{} path references in $for and $each bodies when another string is escaped", () => {
    // jempl renders #{n} in loop bodies that hold $if (or are arrays), but
    // not on its own, so loop-body strings must stay unescaped.
    const form = selectForm({
      state: { formValues: {} },
      props: {
        context: { names: ["x", "y"], on: true },
        form: {
          title: "Scene #{1}",
          fields: [
            { "$for n, i in names": { "$if on": { name: "${n}", type: "input-text", label: "#{n}" } } },
            { "$each": "m in names", "$if on": { name: "e${m}", type: "input-text", label: "#{m}" } },
          ],
        },
      },
    });

    expect(form.title).toBe(`Scene #${WORD_JOINER}{1}`);
    expect(form.fields.map((field) => [field.name, field.label])).toEqual([
      ["x", "names[0]"],
      ["y", "names[1]"],
      ["ex", "names[0]"],
      ["ey", "names[1]"],
    ]);
  });

  it("rethrows the original error when escaping strings cannot fix the form", () => {
    expect(() =>
      selectForm({
        state: { formValues: {} },
        props: {
          form: {
            fields: [{ name: "a", type: "input-text", label: "A", $when: "a === b" }],
          },
        },
      }),
    ).toThrow("Invalid comparison operator '==='");
  });
});

describe("escapeFormText", () => {
  it("puts a word joiner after $ and # so the text renders as written", () => {
    const text = "${x} and #{y}, $5 {z}";
    const escaped = escapeFormText(text);

    expect(escaped).toBe(`$${WORD_JOINER}{x} and #${WORD_JOINER}{y}, $5 {z}`);
    expect(labelOf(escaped, { x: "no" })).toBe(escaped);
  });

  it("converts other values to strings", () => {
    expect(escapeFormText(5)).toBe("5");
  });
});
