// @vitest-environment jsdom
// The shared per-breakpoint style builder in src/common/responsive.js and
// src/common/dimensions.js, and the buckets that rtgl-view, rtgl-grid and
// rtgl-image build with it. Bucket entries are compared in order, because the
// order is the order of the declarations in the generated <style>.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import createView from "../src/primitives/view.js";
import createGrid from "../src/primitives/grid.js";
import createImage from "../src/primitives/image.js";
import {
  applyScrollStyles,
  applyVisibility,
  applyZIndexAndOpacity,
  commitStyleText,
  rebuildResponsiveStyles,
} from "../src/common/responsive.js";
import { applySizing, dimensionWithUnit } from "../src/common/dimensions.js";
import * as common from "../src/common.js";

const classes = {
  view: createView({}),
  grid: createGrid({}),
  image: createImage({}),
};
const tag = (name) => `rtgl-${name}-responsive-styles-test`;

const withAttributes = (element, attrs) => {
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }
  return element;
};
const host = (attrs = {}) => withAttributes(document.createElement("div"), attrs);
const mount = (name, attrs) => {
  const element = withAttributes(document.createElement(tag(name)), attrs);
  document.body.append(element);
  return element;
};
const orderedBuckets = (element) =>
  Object.fromEntries(
    Object.entries(element._styles).map(([size, bucket]) => [
      size,
      Object.entries(bucket),
    ]),
  );
const buildAt = (size, element, build) => {
  const styles = {};
  rebuildResponsiveStyles({
    styles,
    changedSize: size,
    buildStyles: ({ styleBucket, attrName }) =>
      build({ styleBucket, element, attrName, size }),
  });
  return Object.entries(styles[size]);
};

beforeAll(() => {
  vi.stubGlobal(
    "CSSStyleSheet",
    class {
      replaceSync(cssText) {
        this.cssText = cssText;
      }
    },
  );
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  for (const [name, Class] of Object.entries(classes)) {
    customElements.define(tag(name), Class);
  }
});

afterEach(() => {
  document.body.replaceChildren();
});

describe("rebuildResponsiveStyles", () => {
  it("rebuilds every size when no size changed", () => {
    const styles = {};
    const calls = [];
    rebuildResponsiveStyles({
      styles,
      buildStyles: ({ styleBucket, size, attrName }) => {
        calls.push([size, attrName("w")]);
        styleBucket.width = size;
      },
    });

    expect(calls).toEqual([
      ["default", "w"],
      ["sm", "sm-w"],
      ["md", "md-w"],
      ["lg", "lg-w"],
      ["xl", "xl-w"],
    ]);
    expect(styles.md).toEqual({ width: "md" });
  });

  it("replaces only the changed size and keeps the other bucket objects", () => {
    const styles = { default: { width: "1px" }, md: { width: "2px" } };
    const defaultBucket = styles.default;
    const oldMdBucket = styles.md;
    rebuildResponsiveStyles({
      styles,
      changedSize: "md",
      buildStyles: ({ styleBucket, attrName }) => {
        styleBucket.name = attrName("no-wrap");
      },
    });

    expect(styles.default).toBe(defaultBucket);
    expect(styles.md).not.toBe(oldMdBucket);
    expect(styles.md).toEqual({ name: "md-no-wrap" });
  });
});

describe("shared bucket helpers", () => {
  it("writes z-index before opacity, only for the attributes present", () => {
    const element = host({ "md-op": "0.5", "md-z": "3", op: "1" });
    expect(buildAt("md", element, applyZIndexAndOpacity)).toEqual([
      ["z-index", "3"],
      ["opacity", "0.5"],
    ]);
    expect(buildAt("sm", element, applyZIndexAndOpacity)).toEqual([]);
  });

  it("lets show win over hide with the primitive's display", () => {
    const element = host({ hide: "", "sm-hide": "", "sm-show": "" });
    const build = (args) => applyVisibility({ ...args, display: "grid" });
    expect(buildAt("default", element, build)).toEqual([["display", "none"]]);
    expect(buildAt("sm", element, build)).toEqual([["display", "grid"]]);
    expect(buildAt("md", element, build)).toEqual([]);
  });

  it("sizes both axes from wh, which wins over w and h", () => {
    const element = host({ wh: "md", w: "10", h: "20", "sm-w": "50%", "sm-h": "f" });
    expect(buildAt("default", element, applySizing)).toEqual([
      ["width", "var(--spacing-md)"],
      ["min-width", "var(--spacing-md)"],
      ["max-width", "var(--spacing-md)"],
      ["height", "var(--spacing-md)"],
      ["min-height", "var(--spacing-md)"],
      ["max-height", "var(--spacing-md)"],
    ]);
    expect(buildAt("sm", element, applySizing)).toEqual([
      ["width", "50%"],
      ["min-width", "50%"],
      ["max-width", "50%"],
      ["height", "100%"],
      ["min-height", "unset"],
      ["max-height", "unset"],
    ]);
  });

  it("uses flex sizing only when allowFlexGrow is set", () => {
    const element = host({ w: "2fg" });
    expect(buildAt("default", element, applySizing)).toEqual([
      ["width", "2fg"],
      ["min-width", "2fg"],
      ["max-width", "2fg"],
    ]);
    expect(
      buildAt("default", element, (args) =>
        applySizing({ ...args, allowFlexGrow: true }),
      ),
    ).toEqual([
      ["flex-grow", "2"],
      ["flex-basis", "0%"],
      ["min-width", "0"],
      ["max-width", "unset"],
    ]);
  });

  it("inherits sh, sv and overflow from larger sizes, with optional nowrap", () => {
    const element = host({ "xl-sv": "", "md-overflow": "hidden" });
    const scrollY = [
      ["overflow-x", "hidden"],
      ["overflow-y", "auto"],
      ["scrollbar-gutter", "auto"],
      ["--rtgl-scrollbar-x-enabled", "0"],
      ["--rtgl-scrollbar-y-enabled", "1"],
    ];
    expect(buildAt("default", element, applyScrollStyles)).toEqual([]);
    expect(buildAt("lg", element, applyScrollStyles)).toEqual(scrollY);
    expect(buildAt("sm", element, applyScrollStyles)).toEqual([
      ...scrollY.slice(0, 4),
      ["--rtgl-scrollbar-y-enabled", "0"],
      ["overflow", "hidden"],
    ]);
    expect(
      buildAt("lg", element, (args) => applyScrollStyles({ ...args, noWrap: true })),
    ).toEqual([...scrollY, ["flex-wrap", "nowrap"]]);
  });

  it("writes the style text only when it changed", () => {
    const writes = [];
    const element = {
      _lastStyleString: "",
      _styleElement: {
        set textContent(value) {
          writes.push(value);
        },
      },
    };
    commitStyleText(element, "a");
    commitStyleText(element, "a");
    commitStyleText(element, "b");
    expect(writes).toEqual(["a", "b"]);
    expect(element._lastStyleString).toBe("b");
  });

  it("keeps dimensionWithUnit and spacing exported from common.js", () => {
    expect(common.dimensionWithUnit).toBe(dimensionWithUnit);
    expect(["12", "12px", "3fg", "13fg", "50%", "1/2", "lg", "auto"].map(dimensionWithUnit))
      .toEqual(["12px", "12px", "3fg", "13fg", "50%", "1/2", "var(--spacing-lg)", "auto"]);
    expect(dimensionWithUnit(null)).toBeUndefined();
    expect(common.spacing.xs).toBe("--spacing-xs");
  });
});

// These pass unchanged on the code before the shared builder existed.
describe("primitive style buckets", () => {
  it("builds view buckets in declaration order", () => {
    const view = mount("view", {
      z: "2", op: "0.5", ar: "16/9", bgi: " url(a.png) ", bgs: "cover",
      w: "f", h: "1fg", hide: "", "md-show": "", d: "h", ah: "c", av: "e",
      wrap: "", stretch: "", "xl-sv": "", "sm-sh": "", "lg-overflow": "hidden",
    });
    expect(orderedBuckets(view)).toEqual({
      default: [
        ["z-index", "2"], ["opacity", "0.5"], ["aspect-ratio", "16/9"],
        ["background-image", "url(a.png)"], ["background-size", "cover"],
        ["flex-grow", "1"], ["flex-shrink", "1"], ["flex-basis", "0%"],
        ["width", "var(--width-stretch)"], ["min-width", "unset"],
        ["max-width", "unset"], ["min-height", "0"], ["max-height", "unset"],
        ["display", "none"], ["flex-direction", "row"],
        ["justify-content", "center"], ["align-items", "flex-end"],
        ["align-content", "flex-end"], ["flex-wrap", "wrap"],
        ["align-self", "stretch"],
      ],
      sm: [
        ["overflow", "hidden"], ["scrollbar-gutter", "auto"],
        ["--rtgl-scrollbar-x-enabled", "0"], ["--rtgl-scrollbar-y-enabled", "0"],
        ["flex-wrap", "nowrap"],
      ],
      md: [
        ["display", "flex"], ["overflow-x", "hidden"], ["overflow-y", "auto"],
        ["scrollbar-gutter", "auto"], ["--rtgl-scrollbar-x-enabled", "0"],
        ["--rtgl-scrollbar-y-enabled", "0"], ["flex-wrap", "nowrap"],
        ["overflow", "hidden"],
      ],
      lg: [
        ["overflow-x", "hidden"], ["overflow-y", "auto"],
        ["scrollbar-gutter", "auto"], ["--rtgl-scrollbar-x-enabled", "0"],
        ["--rtgl-scrollbar-y-enabled", "0"], ["flex-wrap", "nowrap"],
        ["overflow", "hidden"],
      ],
      xl: [
        ["overflow-x", "hidden"], ["overflow-y", "auto"],
        ["scrollbar-gutter", "auto"], ["--rtgl-scrollbar-x-enabled", "0"],
        ["--rtgl-scrollbar-y-enabled", "1"], ["flex-wrap", "nowrap"],
      ],
    });
  });

  it("sets a default column direction when only a breakpoint sets d", () => {
    const view = mount("view", {
      "md-d": "v", "md-ah": "e", wh: "100", "sm-w": "1/3fb", "no-wrap": "",
    });
    expect(orderedBuckets(view)).toEqual({
      default: [
        ["flex-grow", "0"], ["flex-shrink", "1"], ["flex-basis", "auto"],
        ["width", "100px"], ["min-width", "100px"], ["max-width", "100px"],
        ["height", "100px"], ["min-height", "100px"], ["max-height", "100px"],
        ["flex-direction", "column"], ["flex-wrap", "nowrap"],
      ],
      sm: [
        ["flex-grow", "0"], ["flex-shrink", "0"],
        ["flex-basis", "calc((100% - ((3 - 1) * var(--rtgl-flex-gap, 0px))) / 3)"],
        ["min-width", "0"], ["max-width", "unset"],
      ],
      md: [["flex-direction", "column"], ["align-items", "flex-end"]],
      lg: [],
      xl: [],
    });
  });

  it("builds grid buckets in declaration order", () => {
    const grid = mount("grid", {
      cols: "3", "md-cols": "1fr 2fr", z: "1", op: "0.3", wh: "1/2fb",
      "sm-hide": "", show: "", sh: "", sv: "", "md-overflow": "hidden",
    });
    const clipped = [
      ["overflow", "hidden"], ["scrollbar-gutter", "auto"],
      ["--rtgl-scrollbar-x-enabled", "0"], ["--rtgl-scrollbar-y-enabled", "0"],
    ];
    const scrolling = [
      ["overflow", "auto"], ["scrollbar-gutter", "auto"],
      ["--rtgl-scrollbar-x-enabled", "1"], ["--rtgl-scrollbar-y-enabled", "1"],
    ];
    expect(orderedBuckets(grid)).toEqual({
      default: [
        ["grid-template-columns", "repeat(3, minmax(0, 1fr))"], ["z-index", "1"],
        ["opacity", "0.3"], ["flex-grow", "0"], ["flex-shrink", "0"],
        ["flex-basis", "calc((100% - ((2 - 1) * var(--rtgl-flex-gap, 0px))) / 2)"],
        ["min-width", "0"], ["max-width", "unset"], ["min-height", "0"],
        ["max-height", "unset"], ["display", "grid"], ...scrolling,
      ],
      sm: [["display", "none"], ...clipped],
      md: [["grid-template-columns", "1fr 2fr"], ...clipped],
      lg: scrolling,
      xl: scrolling,
    });
  });

  it("builds image buckets without flex sizing", () => {
    const image = mount("image", {
      w: "120", "md-h": "f", "sm-w": "2fg", ar: "1", z: "3", op: "1", "xl-wh": "md",
    });
    expect(orderedBuckets(image)).toEqual({
      default: [
        ["z-index", "3"], ["opacity", "1"], ["aspect-ratio", "1"],
        ["width", "120px"], ["min-width", "120px"], ["max-width", "120px"],
      ],
      sm: [["width", "2fg"], ["min-width", "2fg"], ["max-width", "2fg"]],
      md: [["height", "100%"], ["min-height", "unset"], ["max-height", "unset"]],
      lg: [],
      xl: [
        ["width", "var(--spacing-md)"], ["min-width", "var(--spacing-md)"],
        ["max-width", "var(--spacing-md)"], ["height", "var(--spacing-md)"],
        ["min-height", "var(--spacing-md)"], ["max-height", "var(--spacing-md)"],
      ],
    });
  });

  it("rebuilds view buckets after attribute changes", () => {
    const view = mount("view", { w: "200", "md-w": "120", "xl-sv": "" });
    view.setAttribute("md-w", "80");
    view.setAttribute("lg-op", "0.4");
    view.removeAttribute("xl-sv");
    view.setAttribute("sh", "");
    const scrollX = [
      ["overflow-x", "auto"], ["overflow-y", "hidden"],
      ["scrollbar-gutter", "auto"], ["--rtgl-scrollbar-x-enabled", "1"],
      ["--rtgl-scrollbar-y-enabled", "0"], ["flex-wrap", "nowrap"],
    ];
    const fixedWidth = (width) => [
      ["flex-grow", "0"], ["flex-shrink", "1"], ["flex-basis", "auto"],
      ["width", width], ["min-width", width], ["max-width", width],
    ];
    expect(orderedBuckets(view)).toEqual({
      default: [...fixedWidth("200px"), ...scrollX],
      sm: scrollX,
      md: [...fixedWidth("80px"), ...scrollX],
      lg: [["opacity", "0.4"], ...scrollX],
      xl: scrollX,
    });
  });

  it.each(["view", "grid", "image"])(
    "does not rewrite the %s <style> when the CSS is unchanged",
    (name) => {
      const element = mount(name, { "md-w": "120" });
      const style = element.shadowRoot.querySelector("style");
      const text = style.textContent;
      expect(text).toContain("width: 120px !important;");
      const firstChild = style.firstChild;
      element.setAttribute("md-w", "120px");
      expect(style.textContent).toBe(text);
      expect(style.firstChild).toBe(firstChild);
    },
  );
});
