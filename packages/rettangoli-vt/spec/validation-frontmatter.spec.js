import { describe, expect, it } from "vitest";
import { validateFrontMatter } from "../src/validation.js";

describe("validateFrontMatter select targeting", () => {
  it("accepts a structured select step with selector", () => {
    expect(() => {
      validateFrontMatter(
        {
          steps: [
            {
              action: "select",
              selector: "#login-email",
              steps: [{ action: "focus" }],
            },
          ],
        },
        "specs/page.yaml",
      );
    }).not.toThrow();
  });

  it("rejects a structured select step without testId or selector", () => {
    expect(() => {
      validateFrontMatter(
        {
          steps: [
            {
              action: "select",
              steps: [{ action: "click" }],
            },
          ],
        },
        "specs/page.yaml",
      );
    }).toThrow('requires exactly one of "testId" or "selector"');
  });

  it("rejects a structured select step with both testId and selector", () => {
    expect(() => {
      validateFrontMatter(
        {
          steps: [
            {
              action: "select",
              testId: "login-email",
              selector: "#login-email",
              steps: [{ action: "click" }],
            },
          ],
        },
        "specs/page.yaml",
      );
    }).toThrow('requires exactly one of "testId" or "selector"');
  });
});
