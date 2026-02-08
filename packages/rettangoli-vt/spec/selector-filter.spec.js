import { describe, expect, it } from "vitest";
import {
  normalizeSelectors,
  hasSelectors,
  filterGeneratedFilesBySelectors,
  filterRelativeScreenshotPathsBySelectors,
} from "../src/selector-filter.js";

const sections = [
  {
    title: "components_basic",
    files: "components/basic",
  },
  {
    type: "groupLabel",
    title: "Components",
    items: [
      { title: "forms_group", files: "components/forms" },
      { title: "tables_group", files: "components/tables" },
    ],
  },
];

describe("selector-filter", () => {
  it("normalizes and deduplicates selector inputs", () => {
    const selectors = normalizeSelectors({
      folder: ["./components/forms/", "components/forms"],
      group: ["Forms_Group", "forms_group"],
      item: ["pages/home.html", "./pages/home"],
    });

    expect(selectors).toEqual({
      folders: ["components/forms"],
      groups: ["forms_group"],
      items: ["pages/home"],
    });
    expect(hasSelectors(selectors)).toBe(true);
  });

  it("filters generated files by folder/group/item using union semantics", () => {
    const generatedFiles = [
      { path: "components/forms/login.yaml" },
      { path: "components/tables/grid.yaml" },
      { path: "pages/home.yaml" },
      { path: "docs/readme.md" },
    ];

    const selectors = normalizeSelectors({
      folder: "components/forms",
      group: "tables_group",
      item: "pages/home.html",
    });

    const selected = filterGeneratedFilesBySelectors(generatedFiles, selectors, sections);

    expect(selected.map((file) => file.path)).toEqual([
      "components/forms/login.yaml",
      "components/tables/grid.yaml",
      "pages/home.yaml",
    ]);
  });

  it("throws for unknown group selectors", () => {
    const selectors = normalizeSelectors({ group: "missing_group" });

    expect(() =>
      filterGeneratedFilesBySelectors(
        [{ path: "components/forms/login.yaml" }],
        selectors,
        sections,
      )
    ).toThrow(/Unknown group selector/);
  });

  it("filters screenshot paths by folder/group/item and strips -NN suffix", () => {
    const relativePaths = [
      "components/forms/login-01.webp",
      "components/forms/login-02.webp",
      "components/tables/grid-01.webp",
      "pages/home-01.webp",
      "docs/readme-01.webp",
    ];

    const selectors = normalizeSelectors({
      folder: "components/forms",
      group: "tables_group",
      item: "pages/home.yaml",
    });

    const selected = filterRelativeScreenshotPathsBySelectors(relativePaths, selectors, sections);

    expect(selected).toEqual([
      "components/forms/login-01.webp",
      "components/forms/login-02.webp",
      "components/tables/grid-01.webp",
      "pages/home-01.webp",
    ]);
  });

  it("returns all entries when no selectors are provided", () => {
    const selectors = normalizeSelectors({});
    const relativePaths = ["components/forms/login-01.webp"];

    expect(hasSelectors(selectors)).toBe(false);
    expect(filterRelativeScreenshotPathsBySelectors(relativePaths, selectors, sections)).toEqual(relativePaths);
  });
});
