import { describe, expect, it } from "vitest";

import {
  getDefaultValue,
  validateField,
} from "../src/components/form/form.store.js";

describe("rtgl-form tag-select field helpers", () => {
  it("defaults tag-select fields to an empty array", () => {
    expect(getDefaultValue({ type: "tag-select" })).toEqual([]);
  });

  it("treats an empty tag-select array as missing for required validation", () => {
    const requiredField = {
      name: "tags",
      type: "tag-select",
      required: true,
    };

    expect(validateField(requiredField, [])).toBe("This field is required");
    expect(validateField(requiredField, ["bug"])).toBeNull();
  });
});
