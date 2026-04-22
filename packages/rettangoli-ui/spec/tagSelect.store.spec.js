import { describe, expect, it } from "vitest";

import {
  createInitialState,
  selectViewData,
} from "../src/components/tagSelect/tagSelect.store.js";

describe("rtgl-tag-select store", () => {
  it("renders committed trigger tags separately from draft popover selection state", () => {
    const viewData = selectViewData({
      state: {
        ...createInitialState(),
        isOpen: true,
        hasSelectedValues: true,
        selectedValues: ["feature", "bug"],
        draftSelectedValues: ["bug", "docs"],
      },
      props: {
        options: [
          { type: "section", label: "Labels" },
          { value: "bug", label: "Bug", icon: "info" },
          { value: "docs", label: "Docs" },
          { type: "separator" },
          { value: "feature", label: "Feature", suffixText: "Popular" },
        ],
      },
    });

    expect(viewData.hasSelectedTags).toBe(true);
    expect(viewData.selectedTags.map((tag) => tag.label)).toEqual(["Feature", "Bug"]);
    expect(viewData.selectedTags[1].icon).toBe("info");
    expect(viewData.options[0].isSection).toBe(true);
    expect(viewData.options[1].isSelected).toBe(true);
    expect(viewData.options[1].tagStyle).toContain("--muted-foreground: var(--foreground)");
    expect(viewData.options[2].isSelected).toBe(true);
    expect(viewData.options[3].isSeparator).toBe(true);
    expect(viewData.options[4].isSelected).toBe(false);
    expect(viewData.hasDraftChanges).toBe(true);
    expect(viewData.submitDisabled).toBe(false);
    expect(viewData.placeholder).toBe("Add tag");
  });

  it("shows placeholder labels and fallback labels when selected values do not match options", () => {
    const initialView = selectViewData({
      state: createInitialState(),
      props: {
        placeholder: "Assign tags",
        selectedValues: [],
        options: [],
      },
    });

    expect(initialView.hasSelectedTags).toBe(false);
    expect(initialView.placeholder).toBe("Assign tags");
    expect(initialView.showAddOption).toBe(true);
    expect(initialView.addOptionLabel).toBe("Add tag");
    expect(initialView.placeholderTagStyle).toContain("--muted:");

    const defaultAddChipView = selectViewData({
      state: createInitialState(),
      props: {
        options: [],
      },
    });

    expect(defaultAddChipView.placeholder).toBe("Add tag");

    const viewWithFallback = selectViewData({
      state: {
        ...createInitialState(),
        hasSelectedValues: true,
        selectedValues: ["custom"],
      },
      props: {
        addOption: { label: "Create tag" },
        options: [{ value: "bug", label: "Bug" }],
      },
    });

    expect(viewWithFallback.selectedTags).toHaveLength(1);
    expect(viewWithFallback.selectedTags[0].label).toBe("custom");
    expect(viewWithFallback.triggerTagStyle).toContain("--muted-foreground: var(--foreground)");
    expect(viewWithFallback.placeholderTagStyle).toContain("--muted:");
    expect(viewWithFallback.placeholder).toBe("Add tag");
    expect(viewWithFallback.addOptionLabel).toBe("Create tag");
  });
});
