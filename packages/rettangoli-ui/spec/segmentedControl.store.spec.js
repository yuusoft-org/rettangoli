import { describe, expect, it } from "vitest";
import {
  createInitialState,
  selectViewData,
} from "../src/components/segmented-control/segmented-control.store.js";

describe("rtgl-segmented-control store", () => {
  it("uses the compact size preset when s is sm", () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: { s: "sm", w: "f", options: [] },
    });

    expect(viewData).toMatchObject({
      size: "sm",
      containerSizeAttrString: "h=24",
      optionSizeAttrString: "h=f w=1fg ph=md",
      textSize: "xs",
      iconSize: 14,
      containerAttrString: "w=f",
    });
  });

  it("uses the medium preset by default and for unsupported sizes", () => {
    for (const s of [undefined, "xl", "constructor", "__proto__"]) {
      const viewData = selectViewData({
        state: createInitialState(),
        props: { s, options: [] },
      });

      expect(viewData).toMatchObject({
        size: "md",
        containerSizeAttrString: "",
        optionSizeAttrString: "w=1fg ph=lg pv=md",
        textSize: "sm",
        iconSize: 16,
      });
    }
  });

  it("uses the large size preset when s is lg", () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: { s: "lg", options: [] },
    });

    expect(viewData).toMatchObject({
      size: "lg",
      containerSizeAttrString: "h=40",
      optionSizeAttrString: "h=f w=1fg ph=xl",
      textSize: "md",
      iconSize: 22,
    });
  });

  it("makes each segment square at the selected control size", () => {
    const smallViewData = selectViewData({
      state: createInitialState(),
      props: {
        s: "sm",
        sq: true,
        w: "f",
        options: [{ value: "left" }, { value: "center" }, { value: "right" }],
      },
    });
    const mediumViewData = selectViewData({
      state: createInitialState(),
      props: {
        sq: true,
        options: [{ value: "left" }, { value: "right" }],
      },
    });
    const largeViewData = selectViewData({
      state: createInitialState(),
      props: {
        s: "lg",
        sq: true,
        options: [{ value: "left" }, { value: "right" }],
      },
    });

    expect(smallViewData).toMatchObject({
      isSquare: true,
      containerAttrString: "",
      containerSizeAttrString: "h=24 w=72",
      optionSizeAttrString: "h=f w=1fg",
    });
    expect(mediumViewData).toMatchObject({
      isSquare: true,
      containerSizeAttrString: "h=32 w=64",
      optionSizeAttrString: "h=f w=1fg",
    });
    expect(largeViewData).toMatchObject({
      isSquare: true,
      containerSizeAttrString: "h=40 w=80",
      optionSizeAttrString: "h=f w=1fg",
    });
  });

  it("keeps the add action square and exposes its label accessibly", () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: {
        sq: true,
        addOption: { label: "New view" },
        options: [{ value: "list" }, { value: "grid" }],
      },
    });

    expect(viewData).toMatchObject({
      isSquare: true,
      showAddOption: true,
      containerSizeAttrString: "h=32 w=96",
      optionSizeAttrString: "h=f w=1fg",
      addOptionLabel: "+ New view",
      addOptionAriaLabel: "New view",
    });
  });

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

  it("exposes tooltip view state when an option has tooltip content", () => {
    const state = {
      ...createInitialState(),
      tooltipState: {
        open: true,
        x: 120,
        y: 40,
        place: "t",
        content: "Preview the result",
      },
    };
    const viewData = selectViewData({
      state,
      props: {
        options: [
          {
            value: "preview",
            svg: "play",
            ariaLabel: "Preview mode",
            tooltip: "Preview the result",
          },
        ],
      },
    });

    expect(viewData.hasTooltips).toBe(true);
    expect(viewData.tooltipState).toEqual(state.tooltipState);
  });

  it("does not render a tooltip host for empty tooltip content", () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: {
        options: [
          { value: "plain", label: "Plain" },
          { value: "empty", label: "Empty", tooltip: "" },
        ],
      },
    });

    expect(viewData.hasTooltips).toBe(false);
    expect(viewData.tooltipState).toMatchObject({
      open: false,
      content: "",
    });
  });
});
