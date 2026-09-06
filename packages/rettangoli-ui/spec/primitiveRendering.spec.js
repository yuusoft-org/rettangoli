// @vitest-environment jsdom
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import createSvg from "../src/primitives/svg.js";
import createView from "../src/primitives/view.js";
import createGrid from "../src/primitives/grid.js";
import createImage from "../src/primitives/image.js";
import createTextarea from "../src/primitives/textarea.js";

const classes = {
  svg: createSvg({}),
  view: createView({}),
  grid: createGrid({}),
  image: createImage({}),
  textarea: createTextarea({}),
};
const tag = (name) => `rtgl-${name}-rendering-test`;
const make = (name, attrs = {}) => {
  const element = document.createElement(tag(name));
  for (const [key, value] of Object.entries(attrs))
    element.setAttribute(key, value);
  return element;
};
const mount = (element) => {
  document.body.append(element);
  return element;
};
const observe = (element) => {
  const observer = new MutationObserver(() => {});
  observer.observe(element, {
    attributes: true,
    childList: true,
    subtree: true,
  });
  return observer;
};
const iconOne = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>';
const iconTwo =
  '<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4"/></svg>';
let frames;
let frameId = 0;
const flushFrames = () => {
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach((callback) => callback(0));
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
  for (const [name, Class] of Object.entries(classes))
    customElements.define(tag(name), Class);
  classes.svg.addIcon("rendering-one", iconOne);
  classes.svg.addIcon("rendering-two", iconTwo);
});
beforeEach(() => {
  frames = new Map();
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback) => {
      frames.set(++frameId, callback);
      return frameId;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", (id) => frames.delete(id));
});
afterEach(() => {
  document.body.replaceChildren();
  frames.clear();
  vi.restoreAllMocks();
});
afterAll(() => vi.unstubAllGlobals());

describe.each(["view", "grid", "image", "textarea"])(
  "%s style lifecycle",
  (name) => {
    it("calculates final detached attributes once at connection", () => {
      const element = make(name);
      const update = vi.spyOn(element, "updateStyles");
      for (const [key, value] of Object.entries({
        w: "200",
        h: "80",
        "md-w": "120",
        p: "md",
      }))
        element.setAttribute(key, value);
      expect(update).not.toHaveBeenCalled();
      mount(element);
      expect(update).toHaveBeenCalledOnce();
      expect(element._styles.default.width).toBe("200px");
      expect(element._styles.md.width).toBe("120px");
    });
    it("also initializes parser-created markup once", () => {
      const update = vi.spyOn(classes[name].prototype, "updateStyles");
      document.body.innerHTML = `<${tag(name)} w="200" h="80" md-w="120" p="md"></${tag(name)}>`;
      expect(update).toHaveBeenCalledOnce();
      expect(document.body.firstElementChild._styles.md.width).toBe("120px");
    });
    it("keeps unrelated breakpoints and immediately applies dimension changes/removals", () => {
      const element = mount(
        make(name, { w: "200", h: "80", "md-w": "120", "sm-wh": "40" }),
      );
      const defaultStyles = element._styles.default;
      const smallStyles = element._styles.sm;
      element.setAttribute("md-w", "140");
      expect(element._styles.md.width).toBe("140px");
      expect(element._styles.default).toBe(defaultStyles);
      expect(element._styles.sm).toBe(smallStyles);
      element.setAttribute("md-wh", "60");
      expect(element._styles.md.width).toBe("60px");
      expect(element._styles.md.height).toBe("60px");
      element.removeAttribute("md-wh");
      expect(element._styles.md.width).toBe("140px");
      expect(element._styles.md.height).toBeUndefined();
      element.removeAttribute("md-w");
      expect(element._styles.md.width).toBeUndefined();
      expect(element._styles.default.width).toBe("200px");
    });
    it("skips duplicate and CSS-only attributes without shadow DOM mutations", () => {
      const element = mount(make(name, { w: "200" }));
      const update = vi.spyOn(element, "updateStyles");
      const observer = observe(element.shadowRoot);
      element.setAttribute("w", "200");
      element.setAttribute("m", "md");
      element.setAttribute("sm-m", "lg");
      expect(update).not.toHaveBeenCalled();
      expect(observer.takeRecords()).toEqual([]);
      observer.disconnect();
    });
    it("retains DOM/styles across moves and applies detached edits on reconnect", () => {
      const element = mount(make(name, { w: "200", "md-h": "60" }));
      const nodes = [...element.shadowRoot.childNodes];
      const update = vi.spyOn(element, "updateStyles");
      mount(element);
      expect(update).not.toHaveBeenCalled();
      expect([...element.shadowRoot.childNodes]).toEqual(nodes);
      element.remove();
      element.setAttribute("w", "300");
      element.removeAttribute("md-h");
      expect(update).not.toHaveBeenCalled();
      mount(element);
      expect(update).toHaveBeenCalledOnce();
      expect(element._styles.default.width).toBe("300px");
      expect(element._styles.md.height).toBeUndefined();
      expect([...element.shadowRoot.childNodes]).toEqual(nodes);
    });
  },
);

describe("responsive view/grid behavior", () => {
  it("recalculates inherited alignment when breakpoint directions change", () => {
    const view = mount(
      make("view", { "xl-d": "h", "md-ah": "c", "md-av": "e" }),
    );
    expect(view._styles.default["flex-direction"]).toBe("column");
    expect(view._styles.md["justify-content"]).toBe("center");
    expect(view._styles.md["align-items"]).toBe("flex-end");
    view.setAttribute("xl-d", "v");
    expect(view._styles.md["justify-content"]).toBe("flex-end");
    expect(view._styles.md["align-items"]).toBe("center");
    view.removeAttribute("xl-d");
    expect(view._styles.default["flex-direction"]).toBeUndefined();
    view.setAttribute("d", "h");
    expect(view._styles.md["justify-content"]).toBe("center");
  });
  it.each(["view", "grid"])(
    "preserves inherited overflow and scrollbar lifecycle for %s",
    (name) => {
      const element = mount(make(name, { w: "200", h: "80", "xl-sv": "" }));
      const controller = element._scrollbarController;
      expect(controller._active).toBe(true);
      expect(element._styles.sm["overflow-y"]).toBe("auto");
      element.setAttribute("md-overflow", "hidden");
      expect(element._styles.md["--rtgl-scrollbar-y-enabled"]).toBe("0");
      expect(element._styles.sm["--rtgl-scrollbar-y-enabled"]).toBe("0");
      expect(element._styles.lg["--rtgl-scrollbar-y-enabled"]).toBe("1");
      element.removeAttribute("md-overflow");
      expect(element._styles.sm["--rtgl-scrollbar-y-enabled"]).toBe("1");
      element.scrollTop = 25;
      element.remove();
      expect(controller._connected).toBe(false);
      expect(controller._active).toBe(false);
      mount(element);
      expect(element.scrollTop).toBe(25);
      expect(controller._active).toBe(true);
      element.removeAttribute("xl-sv");
      expect(element._styles.sm["overflow-y"]).toBeUndefined();
      expect(controller._active).toBe(false);
    },
  );
  it("updates and removes grid columns independently at each breakpoint", () => {
    const grid = mount(make("grid", { cols: "4", "md-cols": "2" }));
    grid.setAttribute("md-cols", "3");
    expect(grid._styles.default["grid-template-columns"]).toBe(
      "repeat(4, minmax(0, 1fr))",
    );
    expect(grid._styles.md["grid-template-columns"]).toBe(
      "repeat(3, minmax(0, 1fr))",
    );
    grid.removeAttribute("md-cols");
    expect(grid._styles.md["grid-template-columns"]).toBeUndefined();
  });
  it.each(["view", "grid", "image"])(
    "preserves %s links and content during unrelated updates",
    (name) => {
      const element = mount(make(name, { href: "/first", "new-tab": "" }));
      const link = element.shadowRoot.querySelector("a");
      const content = element.shadowRoot.querySelector(
        name === "image" ? "img" : "slot",
      );
      link.focus();
      element.setAttribute("w", "200");
      element.setAttribute("href", "/second");
      expect(element.shadowRoot.querySelector("a")).toBe(link);
      expect(element.shadowRoot.activeElement).toBe(link);
      expect(link.getAttribute("href")).toBe("/second");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      element.setAttribute("rel", "nofollow");
      element.removeAttribute("new-tab");
      expect(link.getAttribute("target")).toBeNull();
      expect(link.getAttribute("rel")).toBe("nofollow");
      element.removeAttribute("href");
      expect(element.shadowRoot.querySelector("a")).toBeNull();
      expect(
        element.shadowRoot.querySelector(name === "image" ? "img" : "slot"),
      ).toBe(content);
    },
  );
});

describe("SVG rendering", () => {
  it("defers parsing and retains SVG nodes on sizing changes and reconnects", () => {
    const svg = make("svg", {
      svg: "rendering-one",
      w: "48",
      h: "12",
      wh: "24",
    });
    expect(svg.shadowRoot.childNodes).toHaveLength(0);
    mount(svg);
    const nativeSvg = svg.shadowRoot.firstElementChild;
    const observer = observe(svg.shadowRoot);
    svg.setAttribute("wh", "32");
    svg.setAttribute("wh", "32");
    svg.setAttribute("svg", "rendering-one");
    mount(svg);
    expect(svg.shadowRoot.firstElementChild).toBe(nativeSvg);
    expect(observer.takeRecords()).toEqual([]);
    expect(svg.style.width).toBe("32px");
    expect(svg.style.height).toBe("32px");
    svg.removeAttribute("wh");
    expect(svg.style.width).toBe("48px");
    expect(svg.style.height).toBe("12px");
    expect(svg.shadowRoot.firstElementChild).toBe(nativeSvg);
    observer.disconnect();
  });
  it("renders parser-created SVG markup only once", () => {
    const render = vi.spyOn(classes.svg.prototype, "_render");
    document.body.innerHTML = `<${tag("svg")} svg="rendering-one" w="48" h="12" wh="24"></${tag("svg")}>`;
    expect(render).toHaveBeenCalledOnce();
    expect(
      document.body.firstElementChild.shadowRoot.querySelector("circle"),
    ).not.toBeNull();
  });
  it("replaces changed icons, clears missing icons, and honors key resets", () => {
    const svg = mount(make("svg", { svg: "rendering-one" }));
    const first = svg.shadowRoot.firstElementChild;
    svg.setAttribute("svg", "rendering-two");
    expect(svg.shadowRoot.querySelector("rect")).not.toBeNull();
    expect(svg.shadowRoot.firstElementChild).not.toBe(first);
    const second = svg.shadowRoot.firstElementChild;
    svg.setAttribute("key", "reset");
    expect(svg.shadowRoot.firstElementChild).not.toBe(second);
    svg.setAttribute("svg", "rendering-missing");
    expect(svg.shadowRoot.childNodes).toHaveLength(0);
    svg.removeAttribute("svg");
    expect(svg.shadowRoot.childNodes).toHaveLength(0);
  });
  it("supports late/replaced registrations with the same name", () => {
    const svg = mount(make("svg", { svg: "rendering-late" }));
    expect(svg.shadowRoot.childNodes).toHaveLength(0);
    classes.svg.addIcon("rendering-late", iconOne);
    svg.setAttribute("svg", "rendering-late");
    expect(svg.shadowRoot.querySelector("circle")).not.toBeNull();
    classes.svg.addIcon("rendering-late", iconTwo);
    svg.setAttribute("wh", "24");
    expect(svg.shadowRoot.querySelector("rect")).not.toBeNull();
    delete classes.svg.icons["rendering-late"];
  });
  it("applies detached icon/size edits and detached key resets", () => {
    const svg = mount(make("svg", { svg: "rendering-one", wh: "24" }));
    svg.remove();
    svg.setAttribute("svg", "rendering-two");
    svg.setAttribute("wh", "40");
    mount(svg);
    expect(svg.shadowRoot.querySelector("rect")).not.toBeNull();
    expect(svg.style.width).toBe("40px");
    const icon = svg.shadowRoot.firstElementChild;
    svg.remove();
    svg.setAttribute("key", "detached-reset");
    mount(svg);
    expect(svg.shadowRoot.firstElementChild).not.toBe(icon);
  });
});

describe("image attribute updates", () => {
  it("does not rewrite src for alt, style, link, or reconnect updates", () => {
    const image = mount(make("image", { src: "/one.png", alt: "First" }));
    const img = image.shadowRoot.querySelector("img");
    const observer = observe(img);
    image.setAttribute("alt", "Second");
    expect(
      observer.takeRecords().map(({ attributeName }) => attributeName),
    ).toEqual(["alt"]);
    image.setAttribute("src", "/one.png");
    image.setAttribute("w", "120");
    image.setAttribute("of", "cov");
    image.setAttribute("href", "/destination");
    mount(image);
    expect(observer.takeRecords()).toEqual([]);
    expect(image.shadowRoot.querySelector("img")).toBe(img);
    image.setAttribute("src", "/two.png");
    expect(
      observer.takeRecords().map(({ attributeName }) => attributeName),
    ).toEqual(["src"]);
    image.removeAttribute("src");
    image.removeAttribute("alt");
    expect(img.hasAttribute("src")).toBe(false);
    expect(img.hasAttribute("alt")).toBe(false);
    observer.disconnect();
  });
});

describe("textarea editing state", () => {
  it("keeps the final attribute write ordered after intervening animation-frame work", () => {
    const textarea = mount(make("textarea"));
    textarea.setAttribute("value", "First");
    requestAnimationFrame(() => {
      textarea.value = "Intervening property write";
    });
    textarea.setAttribute("value", "Last");
    flushFrames();
    expect(textarea.value).toBe("Last");
  });

  it("coalesces writes at the existing next-frame boundary without style work", () => {
    const textarea = mount(make("textarea"));
    const update = vi.spyOn(textarea, "updateStyles");
    textarea.setAttribute("value", "First");
    textarea.setAttribute("value", "Second");
    textarea.setAttribute("placeholder", "First hint");
    textarea.setAttribute("placeholder", "Second hint");
    expect(textarea.value).toBe("");
    expect(frames.size).toBe(2);
    flushFrames();
    expect(textarea.value).toBe("Second");
    expect(textarea.shadowRoot.querySelector("textarea").placeholder).toBe(
      "Second hint",
    );
    expect(update).not.toHaveBeenCalled();
    textarea.setAttribute("value", "Second");
    textarea.setAttribute("placeholder", "Second hint");
    expect(frames.size).toBe(0);
  });
  it("keeps focus/selection/scroll during style updates and retains edits across moves", () => {
    const textarea = mount(make("textarea", { value: "Initial content" }));
    flushFrames();
    textarea.value = "Edited content";
    textarea.focus();
    const native = textarea.shadowRoot.querySelector("textarea");
    native.setSelectionRange(2, 6);
    native.scrollTop = 10;
    textarea.setAttribute("w", "200");
    textarea.setAttribute("md-h", "120");
    expect(textarea.shadowRoot.activeElement).toBe(native);
    expect([native.selectionStart, native.selectionEnd]).toEqual([2, 6]);
    expect(native.scrollTop).toBe(10);
    mount(textarea);
    expect(textarea.shadowRoot.querySelector("textarea")).toBe(native);
    expect(textarea.value).toBe("Edited content");
    expect([native.selectionStart, native.selectionEnd]).toEqual([2, 6]);
    textarea.setAttribute("key", "reset");
    flushFrames();
    expect(textarea.value).toBe("Initial content");
  });
  it("preserves pre-mount value properties, removals and placeholder sentinel", () => {
    const textarea = make("textarea");
    textarea.value = "Property value";
    mount(textarea);
    expect(textarea.value).toBe("Property value");
    textarea.setAttribute("value", "Attribute value");
    flushFrames();
    expect(textarea.value).toBe("Attribute value");
    textarea.removeAttribute("value");
    textarea.setAttribute("placeholder", "null");
    flushFrames();
    expect(textarea.value).toBe("");
    const native = textarea.shadowRoot.querySelector("textarea");
    expect(native.hasAttribute("placeholder")).toBe(false);
    textarea.setAttribute("placeholder", "Hint");
    flushFrames();
    textarea.removeAttribute("placeholder");
    flushFrames();
    expect(native.getAttribute("placeholder")).toBe("");
  });
  it("preserves value events and reactive native attributes", () => {
    const textarea = mount(
      make("textarea", { rows: "4", cols: "30", disabled: "false" }),
    );
    const native = textarea.shadowRoot.querySelector("textarea");
    expect(native.disabled).toBe(true);
    expect(native.rows).toBe(4);
    expect(native.cols).toBe(30);
    textarea.removeAttribute("disabled");
    textarea.removeAttribute("rows");
    textarea.removeAttribute("cols");
    expect(native.disabled).toBe(false);
    expect(native.hasAttribute("rows")).toBe(false);
    expect(native.hasAttribute("cols")).toBe(false);
    const events = [];
    document.body.addEventListener(
      "value-input",
      (event) => events.push([event.type, event.detail.value]),
      { once: true },
    );
    document.body.addEventListener(
      "value-change",
      (event) => events.push([event.type, event.detail.value]),
      { once: true },
    );
    textarea.value = "Updated";
    native.dispatchEvent(new Event("input", { bubbles: true }));
    native.dispatchEvent(new Event("change", { bubbles: true }));
    expect(events).toEqual([
      ["value-input", "Updated"],
      ["value-change", "Updated"],
    ]);
    textarea.select();
    expect([native.selectionStart, native.selectionEnd]).toEqual([0, 7]);
  });
});
