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

    expect(viewData.triggerTags.map((tag) => tag.label)).toEqual(["Feature", "Bug"]);
    expect(viewData.triggerTags[1].icon).toBe("info");
    expect(viewData.triggerTags[0].tagStyle).toContain("--muted-foreground: var(--foreground)");
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

    expect(initialView.triggerTags).toHaveLength(1);
    expect(initialView.triggerTags[0].label).toBe("Assign tags");
    expect(initialView.placeholder).toBe("Assign tags");
    expect(initialView.showAddOption).toBe(true);
    expect(initialView.addOptionLabel).toBe("Add tag");
    expect(initialView.triggerTags[0].tagStyle).toContain("--muted:");

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

    expect(viewWithFallback.triggerTags).toHaveLength(1);
    expect(viewWithFallback.triggerTags[0].label).toBe("custom");
    expect(viewWithFallback.triggerTags[0].tagStyle).toContain("--muted-foreground: var(--foreground)");
    expect(viewWithFallback.placeholder).toBe("Add tag");
    expect(viewWithFallback.addOptionLabel).toBe("Create tag");
  });

  it("keeps save enabled even when the draft selection matches the committed values", () => {
    const viewData = selectViewData({
      state: {
        ...createInitialState(),
        isOpen: true,
        hasSelectedValues: true,
        selectedValues: ["bug"],
        draftSelectedValues: ["bug"],
      },
      props: {
        options: [{ value: "bug", label: "Bug" }],
      },
    });

    expect(viewData.hasDraftChanges).toBe(false);
    expect(viewData.submitDisabled).toBe(false);
  });

  it("hides the popover add action when noAdd is enabled", () => {
    const viewData = selectViewData({
      state: {
        ...createInitialState(),
        isOpen: true,
      },
      props: {
        noAdd: true,
        addOption: { label: "Create tag" },
        options: [{ value: "bug", label: "Bug" }],
      },
    });

    expect(viewData.showAddOption).toBe(false);
    expect(viewData.addOptionLabel).toBe("Create tag");
    expect(viewData.containerAttrString).not.toContain("noAdd");
  });
});
