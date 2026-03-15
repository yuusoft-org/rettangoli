import { describe, expect, it } from "vitest";
import { deriveAnchorId, deriveSectionPageKey } from "../src/section-page-key.js";

describe("section page key helpers", () => {
  it("derives section page keys from free-form titles", () => {
    expect(
      deriveSectionPageKey({ title: "Buttons / Primary States!", files: "components/buttons" }),
    ).toBe("buttons-primary-states");
  });

  it("falls back to files when a title has no slug-safe characters", () => {
    expect(
      deriveSectionPageKey({ title: "!!!", files: "components/forms/advanced" }),
    ).toBe("components-forms-advanced");
  });

  it("derives anchor ids with a fallback value", () => {
    expect(deriveAnchorId("Release Notes / v2.0")).toBe("release-notes-v2-0");
    expect(deriveAnchorId("!!!", "specs/forms/advanced")).toBe("specs-forms-advanced");
  });
});
