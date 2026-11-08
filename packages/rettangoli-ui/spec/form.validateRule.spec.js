import { describe, expect, it } from "vitest";

import { validateField } from "../src/components/form/form.store.js";

const patternField = (value) => ({
  name: "code",
  type: "input-text",
  rules: [{ rule: "pattern", value }],
});

describe("validateRule pattern presets", () => {
  // Names inherited from Object.prototype are not presets: they are used as
  // plain regular expressions, like any other unknown preset name.
  it.each(["constructor", "toString", "__proto__"])(
    "treats %s as a regular expression instead of a preset",
    (name) => {
      expect(validateField(patternField(name), "x")).toBe("Invalid format");
      expect(validateField(patternField(name), `a ${name} b`)).toBe(null);
    },
  );

  it("still uses the email and url presets", () => {
    expect(validateField(patternField("email"), "a@b.co")).toBe(null);
    expect(validateField(patternField("email"), "email")).toBe("Invalid format");
    expect(validateField(patternField("url"), "https://x")).toBe(null);
  });
});
