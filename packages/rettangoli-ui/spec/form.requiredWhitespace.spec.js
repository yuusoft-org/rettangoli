// `required` on text the user types (input-text, input-textarea,
// popover-input) rejects a value that String.prototype.trim leaves empty.
// Every other type, and every other check, treats such a string as before.
import { afterEach, describe, expect, it } from "vitest";

import { bindStore } from "../../rettangoli-fe/src/core/runtime/store.js";
import { setFormMessages } from "../src/common/formMessages.js";
import { FIELD_TYPES } from "../src/components/form/fieldTypes.js";
import * as formStore from "../src/components/form/form.store.js";

const { validateField, validateForm } = formStore;

const REQUIRED = "This field is required";
const FREE_TEXT = ["input-text", "input-textarea", "popover-input"];
const OTHER_TYPES = Object.keys(FIELD_TYPES).filter((type) => !FREE_TEXT.includes(type));

// Everything trim() removes: the WhiteSpace and LineTerminator code points.
const TRIMMED_CODE_POINTS = [
  0x0009, 0x000a, 0x000b, 0x000c, 0x000d, 0x0020, 0x00a0, 0x1680,
  0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a,
  0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff,
];
const WHITESPACE_ONLY = [
  ["one space", " "],
  ["spaces", "    "],
  ["a tab", "\t"],
  ["line breaks", "\n\r\n"],
  ["a no-break space (U+00A0)", " "],
  ["an ideographic space (U+3000)", "　"],
  ["a mix", " \t\n 　 "],
  ["every code point trim() removes", String.fromCodePoint(...TRIMMED_CODE_POINTS)],
];
// Invisible, but not whitespace for trim(): these stay values.
const NOT_WHITESPACE = [
  ["a zero-width space (U+200B)", "​"],
  ["a zero-width joiner (U+200D)", "‍"],
  ["a word joiner (U+2060)", "⁠"],
  ["a braille blank (U+2800)", "⠀"],
  ["a next line control (U+0085)", "\u0085"],
];

afterEach(() => setFormMessages({}));

describe("required on text fields: whitespace-only values", () => {
  describe.each(FREE_TEXT)("%s", (type) => {
    const field = { name: "f", type, required: true };

    it.each(WHITESPACE_ONLY)("fails for %s", (_, value) => {
      expect(validateField(field, value)).toBe(REQUIRED);
    });

    it.each(TRIMMED_CODE_POINTS.map((codePoint) => [
      `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`,
      String.fromCodePoint(codePoint),
    ]))("fails for %s alone", (_, value) => {
      expect(value.trim()).toBe("");
      expect(validateField(field, value)).toBe(REQUIRED);
    });

    it.each(NOT_WHITESPACE)("passes for %s, which trim() keeps", (_, value) => {
      expect(validateField(field, value)).toBeNull();
    });

    it.each([
      ["text", "a"],
      ["text between spaces", "  a  "],
      ["text between line breaks", "\n a \n"],
      ["a zero", "0"],
      ["a number", 0],
      ["true", true],
    ])("passes for %s", (_, value) => {
      expect(validateField(field, value)).toBeNull();
    });

    it.each([["undefined", undefined], ["null", null], ["an empty string", ""]])(
      "still fails for %s",
      (_, value) => {
        expect(validateField(field, value)).toBe(REQUIRED);
      },
    );

    it("uses the field's own required message", () => {
      const custom = { ...field, required: { message: "Name the scene" } };
      expect(validateField(custom, " \t ")).toBe("Name the scene");
      expect(validateField(custom, " a ")).toBeNull();
    });

    it("uses the app-wide required message", () => {
      setFormMessages({ required: "Ce champ est obligatoire" });
      expect(validateField(field, "　")).toBe("Ce champ est obligatoire");
    });

    it("falls back to the default message for an empty custom message", () => {
      expect(validateField({ ...field, required: { message: "" } }, "  ")).toBe(REQUIRED);
    });

    it.each([undefined, false, null, 0, ""])("accepts whitespace when required is %s", (required) => {
      expect(validateField({ name: "f", type, required }, "   ")).toBeNull();
    });
  });

  it("applies to a password input", () => {
    const field = { name: "p", type: "input-text", inputType: "password", required: true };
    expect(validateField(field, "   ")).toBe(REQUIRED);
    expect(validateField(field, " p ")).toBeNull();
  });

  it("reports required before the rules and the field's maxLength", () => {
    const field = {
      name: "f",
      type: "input-text",
      required: true,
      maxLength: 2,
      rules: [
        { rule: "minLength", value: 10, message: "too short" },
        { rule: "pattern", value: "^\\S+$", message: "no spaces" },
      ],
    };
    expect(validateField(field, "     ")).toBe(REQUIRED);
  });

  it("keeps running rules on whitespace-only text when the field is not required", () => {
    const base = { name: "f", type: "input-text" };
    expect(validateField({ ...base, rules: [{ rule: "minLength", value: 5 }] }, "   "))
      .toBe("Must be at least 5 characters");
    expect(validateField({ ...base, rules: [{ rule: "minLength", value: 3 }] }, "   ")).toBeNull();
    expect(validateField({ ...base, rules: [{ rule: "pattern", value: "^\\S+$" }] }, "   "))
      .toBe("Invalid format");
    expect(validateField({ ...base, maxLength: 2 }, "   ")).toBe("Must be at most 2 characters");
  });
});

describe("required on other field types: whitespace strings are unchanged", () => {
  const TEMPORAL_ERRORS = {
    "input-date": "Invalid date format",
    "input-time": "Invalid time format",
    "input-datetime": "Invalid date and time format",
    "input-duration": "Invalid duration",
  };

  it.each(OTHER_TYPES)("%s does not report a whitespace string as missing", (type) => {
    const field = { name: "f", type, required: true };
    for (const [, value] of WHITESPACE_ONLY) {
      expect(validateField(field, value)).toBe(TEMPORAL_ERRORS[type] ?? null);
    }
  });

  it.each(["waveform", "", undefined, null, "constructor", "toString", ["input-text"], 1])(
    "an unlisted type %j does not report a whitespace string as missing",
    (type) => {
      expect(validateField({ name: "f", type, required: true }, "   ")).toBeNull();
    },
  );

  it.each([
    ["select", " "],
    ["segmented-control", "\t"],
  ])("a %s option whose value is whitespace counts as chosen", (type, value) => {
    const field = {
      name: "separator",
      type,
      required: true,
      options: [{ label: "Blank", value }, { label: "Comma", value: "," }],
    };
    expect(validateField(field, value)).toBeNull();
    expect(validateField(field, "")).toBe(REQUIRED);
    expect(validateField(field, null)).toBe(REQUIRED);
  });

  it("keeps the other empty-value rules", () => {
    const required = (type) => ({ name: "f", type, required: true });
    expect(validateField(required("tag-select"), [])).toBe(REQUIRED);
    expect(validateField(required("tag-select"), [" "])).toBeNull();
    expect(validateField(required("checkbox"), false)).toBe(REQUIRED);
    expect(validateField(required("checkbox"), true)).toBeNull();
    expect(validateField(required("select"), false)).toBeNull();
    expect(validateField(required("segmented-control"), false)).toBeNull();
    expect(validateField(required("input-number"), Number.NaN)).toBe(REQUIRED);
    expect(validateField(required("input-number"), 0)).toBeNull();
    expect(validateField(required("input-text"), false)).toBe(REQUIRED);
    expect(validateField(required("input-text"), [])).toBe(REQUIRED);
    expect(validateField(required("image"), " ")).toBeNull();
    expect(validateField(required("color-picker"), " ")).toBeNull();
  });
});

describe("required whitespace through the form", () => {
  const fields = [
    { name: "title", type: "input-text", required: true },
    { name: "notes", type: "input-textarea", required: { message: "Write a note" } },
    {
      type: "section",
      label: "More",
      fields: [
        { type: "row", fields: [{ name: "profile.nick", type: "popover-input", required: true }] },
      ],
    },
    { name: "sep", type: "select", required: true, options: [{ label: "Blank", value: " " }] },
    { name: "optional", type: "input-text" },
  ];

  it("validateForm reports every whitespace-only required text field", () => {
    const formValues = {
      title: "  ",
      notes: "\n",
      profile: { nick: " " },
      sep: " ",
      optional: "  ",
    };
    const before = structuredClone(formValues);

    expect(validateForm(fields, formValues)).toEqual({
      valid: false,
      errors: { title: REQUIRED, notes: "Write a note", "profile.nick": REQUIRED },
    });
    // Validation never trims or changes the values.
    expect(formValues).toEqual(before);
  });

  it("validateForm passes once each has text, leading and trailing spaces included", () => {
    expect(validateForm(fields, {
      title: " a ",
      notes: "\nb",
      profile: { nick: "c　" },
      sep: " ",
      optional: "",
    })).toEqual({ valid: true, errors: {} });
  });

  it("keeps the whitespace in the stored and submitted values", () => {
    const props = { form: { fields } };
    const store = bindStore(formStore, props, {});
    store.resetFormValues({
      defaultValues: { title: "  ", notes: "\n", profile: { nick: " " }, sep: " ", optional: " " },
    });
    const { errors } = validateForm(
      formStore.collectAllDataFields(store.selectForm().fields),
      store.getState().formValues,
    );
    store.setErrors({ errors });

    expect(store.selectFormValues()).toEqual({
      title: "  ",
      notes: "\n",
      profile: { nick: " " },
      sep: " ",
      optional: " ",
    });
    const byName = Object.fromEntries(
      store.selectViewData().flatFields.filter((field) => field.name).map((field) => [field.name, field]),
    );
    expect(byName.title._error).toBe(REQUIRED);
    expect(byName.notes._error).toBe("Write a note");
    expect(byName["profile.nick"]._error).toBe(REQUIRED);
    expect(byName.sep._error).toBeNull();
    expect(byName.optional._error).toBeNull();
  });

  it("shows the required message, not only the counter, for an over-limit whitespace value", () => {
    const props = {
      form: {
        fields: [{ name: "t", type: "input-text", required: true, maxLength: 2, showCount: true }],
      },
    };
    const store = bindStore(formStore, props, {});
    store.resetFormValues({ defaultValues: { t: "    " } });
    store.setErrors({ errors: { t: validateField(props.form.fields[0], "    ") } });

    const [field] = store.selectViewData().flatFields;
    expect(field._error).toBe(REQUIRED);
    expect(field._errorText).toBe(REQUIRED);
    expect(field._countText).toBe("4 / 2");
  });
});
