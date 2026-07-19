import { describe, expect, it } from "vitest";
import {
  createInitialState,
  selectViewData,
} from "../src/components/segmented-control/segmented-control.store.js";

describe("rtgl-segmented-control store", () => {
  it("normalizes svg-only options and their accessible labels", () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: {
        selectedValue: "grid",
        options: [
          { value: "list", svg: "text", ariaLabel: "List view" },
          { value: "grid", svg: "grid", ariaLabel: "Grid view" },
        ],
      },
    });

    expect(viewData.options[0]).toMatchObject({
      hasSvg: true,
      accessibleLabel: "List view",
      isSelected: false,
      textColor: "fg",
    });
    expect(viewData.options[1]).toMatchObject({
      hasSvg: true,
      accessibleLabel: "Grid view",
      isSelected: true,
      textColor: "ac-fg",
    });
  });

  it("keeps label-only options and uses the label as their accessible name", () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: {
        options: [{ value: "editor", label: "Editor" }],
      },
    });

    expect(viewData.options[0]).toMatchObject({
      hasSvg: false,
      accessibleLabel: "Editor",
      label: "Editor",
    });
  });

  it("prefers ariaLabel when an svg option also has fallback label text", () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: {
        options: [
          {
            value: "preview",
            label: "Preview fallback",
            svg: "play",
            ariaLabel: "Preview mode",
          },
        ],
      },
    });

    expect(viewData.options[0]).toMatchObject({
      hasSvg: true,
      accessibleLabel: "Preview mode",
    });
  });
});
