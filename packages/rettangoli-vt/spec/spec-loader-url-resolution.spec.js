import { describe, expect, it } from "vitest";
import { createCaptureTasks } from "../src/capture/spec-loader.js";

describe("createCaptureTasks url resolution", () => {
  it("resolves relative frontmatter urls against configUrl when provided", () => {
    const tasks = createCaptureTasks(
      [
        {
          path: "pages/about.yaml",
          frontMatter: {
            url: "/about",
          },
        },
      ],
      {
        serverUrl: "http://localhost:3001",
        configUrl: "http://127.0.0.1:4173",
      },
    );

    expect(tasks[0].url).toBe("http://127.0.0.1:4173/about");
  });

  it("keeps existing behavior when configUrl is not provided", () => {
    const tasks = createCaptureTasks(
      [
        {
          path: "pages/about.yaml",
          frontMatter: {
            url: "/about",
          },
        },
      ],
      {
        serverUrl: "http://localhost:3001",
      },
    );

    expect(tasks[0].url).toBe("http://localhost:3001/about");
  });
});
