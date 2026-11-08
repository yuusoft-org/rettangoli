import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initializeComponentDom } from "../../src/web/componentDom.js";
import { COMMON_COMPONENT_STYLE_TEXT } from "../../src/core/style/commonComponentStyles.js";

const createShadowStub = () => {
  const shadow = {
    adoptedStyleSheets: [],
    children: [],
    firstElementChild: null,
    querySelector: (selector) => {
      if (selector !== "[data-rtgl-render-target]") {
        return null;
      }

      return shadow.children.find(
        (child) => child.getAttribute?.("data-rtgl-render-target") !== null,
      ) ?? null;
    },
    appendChild: (child) => {
      if (!shadow.children.includes(child)) {
        shadow.children.push(child);
      }
      child.parentNode = shadow;
      shadow.firstElementChild = shadow.children[0] ?? null;
      return child;
    },
  };

  return shadow;
};

const createHostStub = () => {
  const host = {
    style: { display: "" },
    appendedChildren: [],
    attachShadowCalls: 0,
    attachShadow: () => {
      host.attachShadowCalls += 1;
      host.shadow = createShadowStub();
      host.shadowRoot = host.shadow;
      return host.shadow;
    },
    appendChild: (child) => {
      host.appendedChildren.push(child);
      child.parentNode = host;
    },
  };
  return host;
};

const createStyleSheetFactory = () => {
  const createdSheets = [];
  return {
    createdSheets,
    createStyleSheet: () => {
      const styleSheet = {
        cssText: "",
        replaceSync: (nextCssText) => {
          styleSheet.cssText = nextCssText;
        },
      };
      createdSheets.push(styleSheet);
      return styleSheet;
    },
  };
};

describe("initializeComponentDom", () => {
  it("sets up shadow root, render target, and style sheets", () => {
    const host = createHostStub();
    const { createStyleSheet, createdSheets } = createStyleSheetFactory();
    const createdElements = [];

    const { shadow, renderTarget, adoptedStyleSheets } = initializeComponentDom({
      host,
      cssText: ".root { color: red; }",
      createStyleSheet,
      createElement: (tagName) => {
        const element = {
          tagName,
          style: { cssText: "" },
          parentNode: null,
        };
        createdElements.push(element);
        return element;
      },
    });

    expect(shadow).toBe(host.shadow);
    expect(renderTarget).toBe(createdElements[0]);
    expect(renderTarget.style.cssText).toBe("display: contents;");
    expect(host.style.display).toBe("contents");
    expect(adoptedStyleSheets).toHaveLength(2);
    expect(createdSheets).toHaveLength(2);
    expect(createdSheets[1].cssText).toContain("color: red");
  });

  it("uses only common stylesheet when cssText is empty", () => {
    const host = createHostStub();
    const { createStyleSheet } = createStyleSheetFactory();

    const result = initializeComponentDom({
      host,
      cssText: "",
      createStyleSheet,
      createElement: () => ({
        style: { cssText: "" },
        parentNode: null,
      }),
    });

    expect(result.adoptedStyleSheets).toHaveLength(1);
  });

  it("reuses the existing shadow root and render target on reconnect", () => {
    const host = createHostStub();
    const { createStyleSheet } = createStyleSheetFactory();
    const createdElements = [];

    const firstDom = initializeComponentDom({
      host,
      cssText: ".root { color: red; }",
      createStyleSheet,
      createElement: (tagName) => {
        const element = {
          tagName,
          style: { cssText: "" },
          parentNode: null,
          __attrs: new Map(),
          setAttribute(name, value) {
            this.__attrs.set(name, String(value));
          },
          getAttribute(name) {
            if (!this.__attrs.has(name)) {
              return null;
            }
            return this.__attrs.get(name);
          },
        };
        createdElements.push(element);
        return element;
      },
    });

    const secondDom = initializeComponentDom({
      host,
      cssText: ".root { color: red; }",
      createStyleSheet,
      createElement: (tagName) => ({
        tagName,
        style: { cssText: "" },
        parentNode: null,
      }),
    });

    expect(host.attachShadowCalls).toBe(1);
    expect(secondDom.shadow).toBe(firstDom.shadow);
    expect(secondDom.renderTarget).toBe(firstDom.renderTarget);
    expect(createdElements).toHaveLength(1);
  });

  it("reattaches an existing render target to the shadow root", () => {
    const host = createHostStub();
    const { createStyleSheet } = createStyleSheetFactory();
    const shadow = createShadowStub();
    const renderTarget = {
      style: { cssText: "" },
      parentNode: null,
      __attrs: new Map([
        ["data-rtgl-render-target", ""],
      ]),
      setAttribute(name, value) {
        this.__attrs.set(name, String(value));
      },
      getAttribute(name) {
        if (!this.__attrs.has(name)) {
          return null;
        }
        return this.__attrs.get(name);
      },
    };

    shadow.firstElementChild = renderTarget;
    host.shadow = shadow;
    host.shadowRoot = shadow;

    initializeComponentDom({
      host,
      cssText: "",
      createStyleSheet,
      createElement: () => ({
        style: { cssText: "" },
        parentNode: null,
      }),
    });

    expect(renderTarget.parentNode).toBe(shadow);
    expect(host.appendedChildren).toHaveLength(0);
  });
});

// Sheets are shared only when CSSStyleSheet is the browser's native one
// (style-module.browser.mjs covers that). A polyfilled sheet keeps every root
// that adopted it, so under a JS CSSStyleSheet (the polyfill, these stubs)
// every call creates fresh sheets, as before the cache.
describe("initializeComponentDom style sheets without a native CSSStyleSheet", () => {
  let constructed;
  let componentDom;

  const createElement = () => ({ style: { cssText: "" }, parentNode: null });
  const connect = (host, cssText) => componentDom.initializeComponentDom({
    host,
    cssText,
    createElement,
  });
  const textsOf = (sheets) => sheets.map((sheet) => sheet.text);

  beforeEach(async () => {
    constructed = [];
    vi.stubGlobal("CSSStyleSheet", class {
      constructor() {
        constructed.push(this);
      }

      replaceSync(text) {
        this.text = text;
      }
    });
    // A fresh module per test, so its sheet cache starts empty.
    vi.resetModules();
    componentDom = await import("../../src/web/componentDom.js");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates no sheet when the module is imported", () => {
    expect(constructed).toHaveLength(0);
  });

  it("creates fresh sheets on every call, for every host", () => {
    const host = createHostStub();
    const first = connect(host, ".root { color: red; }");
    const second = connect(createHostStub(), ".root { color: red; }");
    const reconnected = connect(host, ".root { color: red; }");

    expect(constructed).toHaveLength(6);
    expect(new Set(constructed).size).toBe(6);
    [first, second, reconnected].forEach((dom) => {
      expect(textsOf(dom.adoptedStyleSheets)).toEqual([
        COMMON_COMPONENT_STYLE_TEXT,
        ".root { color: red; }",
      ]);
    });
    expect(first.adoptedStyleSheets).toEqual(constructed.slice(0, 2));
    expect(second.adoptedStyleSheets).toEqual(constructed.slice(2, 4));
    expect(reconnected.adoptedStyleSheets).toEqual(constructed.slice(4, 6));
    expect(host.shadowRoot.adoptedStyleSheets).toBe(reconnected.adoptedStyleSheets);
  });

  it("adopts only the common sheet without cssText", () => {
    const dom = connect(createHostStub(), "");

    expect(textsOf(dom.adoptedStyleSheets)).toEqual([COMMON_COMPONENT_STYLE_TEXT]);
    expect(constructed).toHaveLength(1);
  });

  it("assigns a fresh array to the shadow root on every call", () => {
    const host = createHostStub();
    const first = connect(host, ".root { color: red; }");
    const appended = { text: "app sheet" };
    host.shadowRoot.adoptedStyleSheets = [...host.shadowRoot.adoptedStyleSheets, appended];
    const second = connect(host, ".root { color: red; }");

    expect(second.adoptedStyleSheets).not.toBe(first.adoptedStyleSheets);
    expect(host.shadowRoot.adoptedStyleSheets).toBe(second.adoptedStyleSheets);
    // As before: a reconnect replaces the list, dropping sheets an app appended.
    expect(textsOf(host.shadowRoot.adoptedStyleSheets)).toEqual(
      textsOf(first.adoptedStyleSheets),
    );
    expect(host.shadowRoot.adoptedStyleSheets).not.toContain(appended);
  });

  it("adopts the new text on a hot update and leaves the old sheet alone", () => {
    const host = createHostStub();
    const before = connect(host, ".root { color: red; }");
    componentDom.releaseComponentStyleSheet(".root { color: red; }");
    const after = connect(host, ".root { color: blue; }");

    expect(textsOf(after.adoptedStyleSheets)).toEqual([
      COMMON_COMPONENT_STYLE_TEXT,
      ".root { color: blue; }",
    ]);
    expect(host.shadowRoot.adoptedStyleSheets).toBe(after.adoptedStyleSheets);
    expect(before.adoptedStyleSheets[1].text).toBe(".root { color: red; }");
    expect(constructed).toHaveLength(4);
  });

  it("uses an injected createStyleSheet instead of the global", () => {
    const { createStyleSheet, createdSheets } = createStyleSheetFactory();
    const first = componentDom.initializeComponentDom({
      host: createHostStub(),
      cssText: ".root { color: red; }",
      createStyleSheet,
      createElement,
    });
    const second = componentDom.initializeComponentDom({
      host: createHostStub(),
      cssText: ".root { color: red; }",
      createStyleSheet,
      createElement,
    });

    expect(createdSheets).toHaveLength(4);
    expect(first.adoptedStyleSheets).toEqual([createdSheets[0], createdSheets[1]]);
    expect(second.adoptedStyleSheets).toEqual([createdSheets[2], createdSheets[3]]);
    expect(createdSheets.map((sheet) => sheet.cssText)).toEqual([
      COMMON_COMPONENT_STYLE_TEXT,
      ".root { color: red; }",
      COMMON_COMPONENT_STYLE_TEXT,
      ".root { color: red; }",
    ]);
    expect(constructed).toHaveLength(0);
  });
});

// A bound function prints "[native code]" and can be constructed, so these
// stubs take the path a browser's native CSSStyleSheet takes.
describe("initializeComponentDom style sheets with a native-looking CSSStyleSheet", () => {
  let constructed;
  let componentDom;

  const createElement = () => ({ style: { cssText: "" }, parentNode: null });
  const connect = (cssText) => componentDom.initializeComponentDom({
    host: createHostStub(),
    cssText,
    createElement,
  });

  class StubStyleSheet {
    constructor() {
      constructed.push(this);
    }

    replaceSync(text) {
      this.text = text;
    }
  }

  beforeEach(async () => {
    constructed = [];
    vi.resetModules();
    componentDom = await import("../../src/web/componentDom.js");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shares one sheet per text and evicts a released text", () => {
    vi.stubGlobal("CSSStyleSheet", StubStyleSheet.bind(null));
    const [commonSheet, redSheet] = connect(".a { color: red; }").adoptedStyleSheets;
    const sameRed = connect(".a { color: red; }").adoptedStyleSheets;
    const [, blueSheet] = connect(".b { color: blue; }").adoptedStyleSheets;

    expect(sameRed).toEqual([commonSheet, redSheet]);
    expect(blueSheet).not.toBe(redSheet);
    expect(constructed).toHaveLength(3);

    componentDom.releaseComponentStyleSheet(".a { color: red; }");
    const afterRelease = connect(".a { color: red; }").adoptedStyleSheets;
    const blueAfterRelease = connect(".b { color: blue; }").adoptedStyleSheets;

    expect(afterRelease[0]).toBe(commonSheet);
    expect(afterRelease[1]).not.toBe(redSheet);
    expect(afterRelease[1].text).toBe(".a { color: red; }");
    expect(blueAfterRelease).toEqual([commonSheet, blueSheet]);
    expect(connect(".a { color: red; }").adoptedStyleSheets[1]).toBe(afterRelease[1]);
    expect(constructed).toHaveLength(4);
  });

  it("checks the constructor again after a native one throws", () => {
    // WebKit before 16.4: a native CSSStyleSheet that cannot be constructed,
    // then construct-style-sheets-polyfill replaces it with a JS function.
    function IllegalStyleSheet() {
      throw new TypeError("Illegal constructor");
    }
    vi.stubGlobal("CSSStyleSheet", IllegalStyleSheet.bind(null));
    expect(() => connect(".a { color: red; }")).toThrow("Illegal constructor");

    vi.stubGlobal("CSSStyleSheet", StubStyleSheet);
    const first = connect(".a { color: red; }").adoptedStyleSheets;
    const second = connect(".a { color: red; }").adoptedStyleSheets;

    expect(constructed).toHaveLength(4);
    expect(new Set([...first, ...second]).size).toBe(4);
  });
});
