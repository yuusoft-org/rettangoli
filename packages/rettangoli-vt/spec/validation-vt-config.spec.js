import { describe, expect, it } from "vitest";
import { createCaptureTasks } from "../src/capture/spec-loader.js";
import { validateFrontMatter, validateVtConfig } from "../src/validation.js";

describe("validateVtConfig section page keys", () => {
  it("accepts free-form section and item titles when files can derive keys", () => {
    expect(
      validateVtConfig({
        path: "./vt",
        sections: [
          {
            title: "!!!",
            files: "components",
          },
          {
            type: "groupLabel",
            title: "Group label",
            items: [
              {
                title: "@@@",
                files: "forms/advanced",
              },
            ],
          },
        ],
      }),
    ).toEqual({
      path: "./vt",
      sections: [
        {
          title: "!!!",
          files: "components",
        },
        {
          type: "groupLabel",
          title: "Group label",
          items: [
            {
              title: "@@@",
              files: "forms/advanced",
            },
          ],
        },
      ],
    });
  });
});

// Frontmatter `waitStrategy: event` without a frontmatter waitEvent failed
// validation, although capture uses vt.waitEvent (or --wait-event) for it. It now inherits that
// value; with no waitEvent anywhere, capture planning fails before the browser starts.
describe("waitStrategy: event inherits vt.waitEvent", () => {
  const frontMatter = { waitStrategy: "event" };

  it("accepts frontmatter waitStrategy: event without a frontmatter waitEvent", () => {
    expect(() => validateFrontMatter(frontMatter, "pages/home.html")).not.toThrow();
  });

  it("still requires waitSelector for waitStrategy: selector", () => {
    expect(() => validateFrontMatter({ waitStrategy: "selector" }, "pages/home.html")).toThrow(
      '"pages/home.html: frontMatter.waitSelector" is required when waitStrategy is "selector".',
    );
  });

  it("plans the task with the config waitEvent", () => {
    const [task] = createCaptureTasks([{ path: "pages/home.html", frontMatter }], {
      serverUrl: "http://localhost:3001",
      waitEvent: "app:ready",
      waitStrategy: "event",
    });
    expect(task).toMatchObject({ waitStrategy: "event", waitEvent: "app:ready" });
  });

  it("fails capture planning when neither frontmatter nor config sets waitEvent", () => {
    expect(() =>
      createCaptureTasks(
        [
          { path: "pages/ok.html", frontMatter: { waitStrategy: "event", waitEvent: "page:ready" } },
          { path: "pages/home.html", frontMatter },
        ],
        { serverUrl: "http://localhost:3001", waitStrategy: "load" },
      ),
    ).toThrow(
      '"pages/home.html: frontMatter.waitEvent" is required when waitStrategy is "event" and no vt.waitEvent is set.',
    );
  });
});
