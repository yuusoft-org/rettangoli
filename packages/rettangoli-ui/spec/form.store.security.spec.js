import { afterEach, describe, expect, it } from "vitest";

import {
  get,
  selectFormValues,
  set,
  validateForm,
} from "../src/components/form/form.store.js";

const pollutionKey = "__rtglFormPollutionProbe";

const clearPollutionProbe = () => {
  delete Object.prototype[pollutionKey];
  delete Array.prototype[pollutionKey];
};

afterEach(() => {
  clearPollutionProbe();
});

describe("rtgl-form safe field paths", () => {
  it.each([
    ["terminal __proto__", () => ({}), "__proto__"],
    ["root __proto__", () => ({}), `__proto__.${pollutionKey}`],
    ["nested terminal __proto__", () => ({ profile: {} }), "profile.__proto__"],
    [
      "nested __proto__",
      () => ({ profile: {} }),
      `profile.__proto__.${pollutionKey}`,
    ],
    [
      "array __proto__",
      () => ({ items: [] }),
      `items.__proto__.${pollutionKey}`,
    ],
    [
      "constructor prototype",
      () => ({}),
      `constructor.prototype.${pollutionKey}`,
    ],
    ["terminal constructor", () => ({}), "constructor"],
    [
      "nested constructor",
      () => ({ profile: {} }),
      `profile.constructor.${pollutionKey}`,
    ],
    ["terminal prototype", () => ({}), "prototype"],
    ["root prototype", () => ({}), `prototype.${pollutionKey}`],
    [
      "nested prototype",
      () => ({ profile: {} }),
      `profile.prototype.${pollutionKey}`,
    ],
  ])(
    "rejects %s paths without mutating the target",
    (_label, createTarget, path) => {
      const target = createTarget();
      const expected = structuredClone(target);
      const prototypeSnapshots = [target, ...Object.values(target)]
        .filter((value) => value !== null && typeof value === "object")
        .map((value) => [value, Object.getPrototypeOf(value)]);

      try {
        expect(set(target, path, { [pollutionKey]: "polluted" })).toBe(target);
        expect(Object.prototype[pollutionKey]).toBeUndefined();
        expect(Array.prototype[pollutionKey]).toBeUndefined();
        prototypeSnapshots.forEach(([value, prototype]) => {
          expect(Object.getPrototypeOf(value)).toBe(prototype);
        });
        expect(target).toEqual(expected);
        expect(get(target, path, "fallback")).toBe("fallback");
      } finally {
        clearPollutionProbe();
      }
    },
  );

  it("does not read or mutate inherited branches", () => {
    const inherited = {
      user: {
        name: "Inherited",
      },
    };
    const target = Object.create(inherited);

    expect(get(target, "user.name", "fallback")).toBe("fallback");

    set(target, "user.name", "Owned");

    expect(Object.prototype.hasOwnProperty.call(target, "user")).toBe(true);
    expect(target.user).toEqual({ name: "Owned" });
    expect(inherited.user).toEqual({ name: "Inherited" });
  });

  it("does not invoke inherited setters while creating own branches", () => {
    let setterCalls = 0;
    const prototype = {};
    Object.defineProperty(prototype, "user", {
      configurable: true,
      set() {
        setterCalls++;
      },
    });
    const target = Object.create(prototype);

    set(target, "user.name", "Owned");

    expect(setterCalls).toBe(0);
    expect(Object.prototype.hasOwnProperty.call(target, "user")).toBe(true);
    expect(target.user).toEqual({ name: "Owned" });
  });

  it("returns the fallback for primitive and null intermediates", () => {
    expect(get({ user: "text" }, "user.name", "fallback")).toBe("fallback");
    expect(get({ user: null }, "user.name", "fallback")).toBe("fallback");
  });

  it("preserves safe dotted-path normalization", () => {
    const target = {
      "user.email": "old@example.com",
      sibling: true,
    };

    expect(set(target, "user.email", "new@example.com")).toBe(target);
    expect(target).toEqual({
      user: {
        email: "new@example.com",
      },
      sibling: true,
    });
    expect(get(target, "user.email")).toBe("new@example.com");
  });

  it("preserves nested-over-flat reads and own array traversal", () => {
    const target = {
      "user.email": "flat@example.com",
      user: {
        email: "nested@example.com",
      },
      items: [{ name: "First" }],
    };

    expect(get(target, "user.email")).toBe("nested@example.com");
    expect(get(target, "items.0.name")).toBe("First");
  });

  it("selects own falsy values and omits missing values", () => {
    const fields = [
      { name: "enabled", type: "checkbox" },
      { name: "count", type: "input-number" },
      { name: "label", type: "input-text" },
      { name: "choice", type: "select" },
      { name: "missing", type: "input-text" },
    ];

    expect(
      selectFormValues({
        state: {
          formValues: {
            enabled: false,
            count: 0,
            label: "",
            choice: null,
          },
        },
        props: { form: { fields } },
      }),
    ).toEqual({
      enabled: false,
      count: 0,
      label: "",
      choice: null,
    });
  });

  it("does not expose values inherited from Object.prototype", () => {
    Object.prototype[pollutionKey] = "inherited";

    try {
      const values = selectFormValues({
        state: { formValues: {} },
        props: {
          form: {
            fields: [{ name: pollutionKey, type: "input-text" }],
          },
        },
      });

      expect(values).toEqual({});
    } finally {
      clearPollutionProbe();
    }
  });

  it("does not copy a JSON-owned __proto__ path into the output prototype", () => {
    const formValues = JSON.parse(
      `{"__proto__":{"${pollutionKey}":"polluted"}}`,
    );

    try {
      const values = selectFormValues({
        state: { formValues },
        props: {
          form: {
            fields: [
              {
                name: `__proto__.${pollutionKey}`,
                type: "input-text",
              },
            ],
          },
        },
      });

      expect(values).toEqual({});
      expect(Object.prototype[pollutionKey]).toBeUndefined();
    } finally {
      clearPollutionProbe();
    }
  });

  it.each([
    "__proto__",
    `profile.__proto__.${pollutionKey}`,
    `constructor.prototype.${pollutionKey}`,
    `profile.prototype.${pollutionKey}`,
  ])("reports an invalid form configuration for reserved path %s", (path) => {
    const result = validateForm(
      [{ name: path, type: "input-text", required: true }],
      {},
    );

    expect(result.valid).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result.errors, path)).toBe(
      true,
    );
    expect(result.errors[path]).toBe("Invalid form field path");
    expect(Object.prototype[pollutionKey]).toBeUndefined();
  });

  it.each([
    ["symbol", Symbol("field")],
    ["number", 42],
    ["empty string", ""],
    ["missing", undefined],
  ])(
    "reports an invalid form configuration for a %s field name",
    (_label, name) => {
      const result = validateForm(
        [{ name, type: "input-text", required: true }],
        {},
      );

      expect(result).toEqual({
        valid: false,
        errors: {
          "$invalidFieldPath:0": "Invalid form field path",
        },
      });
    },
  );
});
