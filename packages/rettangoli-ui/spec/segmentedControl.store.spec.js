// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  clearSelectedValue,
  createInitialState,
  selectViewData,
  updateSelectedValue,
} from "../src/components/segmented-control/segmented-control.store.js";
import { withPropsProxy } from "./support/propsProxy.js";

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
    for (const s of [undefined, "md", "xl", "constructor", "__proto__"]) {
      const viewData = selectViewData({
        state: createInitialState(),
        props: { s, options: [] },
      });

      expect(viewData).toMatchObject({
        size: "md",
        containerSizeAttrString: "h=32",
        optionSizeAttrString: "h=f w=1fg ph=lg",
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

// The cases above pass plain objects as props. A mounted component passes the
// props proxy of fe, where every schema prop counts as present and any other
// key is invisible, so these cases build props through it.
describe("rtgl-segmented-control store with the production props proxy", () => {
  const schema = "src/components/segmented-control/segmented-control.schema.yaml";
  const options = [
    { value: "one", label: "One" },
    { value: "two", label: "Two" },
  ];

  it("exposes every schema prop as present and hides keys outside the schema", () => {
    const props = withPropsProxy({ options, notInSchema: 1 }, schema);

    expect(Object.hasOwn(props, "selectedValue")).toBe(true);
    expect(props.selectedValue).toBeUndefined();
    expect(Object.hasOwn(props, "notInSchema")).toBe(false);
  });

  it("uses the compact size preset when s is sm", () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: withPropsProxy({ s: "sm", w: "f", options: [] }, schema),
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

  it("makes each segment square at the selected control size", () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: withPropsProxy({
        sq: true,
        addOption: { label: "New view" },
        options: [{ value: "list" }, { value: "grid" }],
      }, schema),
    });

    expect(viewData).toMatchObject({
      isSquare: true,
      showAddOption: true,
      containerSizeAttrString: "h=32 w=96",
      optionSizeAttrString: "h=f w=1fg",
      containerAttrString: "",
      addOptionLabel: "+ New view",
    });
  });

  it("normalizes svg-only options and their accessible labels", () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: withPropsProxy({
        selectedValue: "grid",
        options: [
          { value: "list", svg: "text", ariaLabel: "List view" },
          { value: "grid", svg: "grid", ariaLabel: "Grid view" },
        ],
      }, schema),
    });

    expect(viewData.options.map((option) => ({
      hasSvg: option.hasSvg,
      accessibleLabel: option.accessibleLabel,
      isSelected: option.isSelected,
      textColor: option.textColor,
    }))).toEqual([
      { hasSvg: true, accessibleLabel: "List view", isSelected: false, textColor: "fg" },
      { hasSvg: true, accessibleLabel: "Grid view", isSelected: true, textColor: "ac-fg" },
    ]);
  });

  it("presses the user's pick while selectedValue is not set", () => {
    const state = {
      ...createInitialState(),
      selectedValue: "two",
      hasSelectedValue: true,
      hasLocalValue: true,
    };

    const viewData = selectViewData({ state, props: withPropsProxy({ options }, schema) });

    expect(viewData.options.map((option) => option.isSelected)).toEqual([false, true]);
    expect(viewData.selectedValue).toBe("two");
    expect(viewData.hasSelectedValue).toBe(true);
  });

  it("presses nothing after the user clears while selectedValue is not set", () => {
    const state = {
      ...createInitialState(),
      selectedValue: undefined,
      hasSelectedValue: false,
      hasLocalValue: true,
    };

    const viewData = selectViewData({
      state,
      props: withPropsProxy({ options: [{ value: undefined, label: "None" }, ...options] }, schema),
    });

    expect(viewData.options.map((option) => option.isSelected)).toEqual([false, false, false]);
    expect(viewData.hasSelectedValue).toBe(false);
  });

  it("presses a defined selectedValue, null included, over the user's pick", () => {
    const state = {
      ...createInitialState(),
      selectedValue: "two",
      hasSelectedValue: true,
      hasLocalValue: true,
    };

    for (const [selectedValue, isSelected] of [["one", [true, false]], [null, [false, false]]]) {
      const viewData = selectViewData({
        state,
        props: withPropsProxy({ options, selectedValue }, schema),
      });
      expect(viewData.options.map((option) => option.isSelected)).toEqual(isSelected);
    }
  });

  it("marks picks and clears as local, and values synced from props as not local", () => {
    const state = structuredClone(createInitialState());
    expect(state.hasLocalValue).toBe(false);

    updateSelectedValue({ state }, { value: "two" });
    expect(state).toMatchObject({ selectedValue: "two", hasSelectedValue: true, hasLocalValue: true });

    updateSelectedValue({ state }, { value: "one", fromProps: true });
    expect(state).toMatchObject({ selectedValue: "one", hasSelectedValue: true, hasLocalValue: false });

    clearSelectedValue({ state });
    expect(state).toMatchObject({ selectedValue: undefined, hasSelectedValue: false, hasLocalValue: true });
  });

  it("presses no option, not even an undefined-valued one, when nothing is set", () => {
    const viewData = selectViewData({
      state: createInitialState(),
      props: withPropsProxy({
        options: [
          { value: undefined, label: "None" },
          { value: "draft", label: "Draft" },
        ],
      }, schema),
    });

    expect(viewData.options.map((option) => option.isSelected)).toEqual([false, false]);
  });
});
