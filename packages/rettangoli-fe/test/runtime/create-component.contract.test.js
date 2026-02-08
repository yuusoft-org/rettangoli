import { afterAll, beforeAll, describe, expect, it } from "vitest";

let createComponent;
let restoreGlobals;
let globalWindowTarget;
let globalDocumentTarget;

const createEventTarget = () => {
  const listeners = new Map();
  return {
    addEventListener(eventType, listener) {
      if (!listeners.has(eventType)) {
        listeners.set(eventType, new Set());
      }
      listeners.get(eventType).add(listener);
    },
    removeEventListener(eventType, listener) {
      listeners.get(eventType)?.delete(listener);
      if (listeners.get(eventType)?.size === 0) {
        listeners.delete(eventType);
      }
    },
    listenerCount(eventType) {
      return listeners.get(eventType)?.size || 0;
    },
  };
};

const createFakeNode = (tagName = "div") => {
  return {
    tagName,
    children: [],
    style: { cssText: "" },
    parentNode: null,
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
  };
};

const installHTMLElementStubs = () => {
  const original = {
    HTMLElement: globalThis.HTMLElement,
    CustomEvent: globalThis.CustomEvent,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    CSSStyleSheet: globalThis.CSSStyleSheet,
    document: globalThis.document,
    window: globalThis.window,
  };

  class FakeHTMLElement {
    constructor() {
      this.__attrs = new Map();
      this.children = [];
      this.style = {};
    }

    setAttribute(name, value) {
      this.__attrs.set(name, String(value));
    }

    getAttribute(name) {
      if (!this.__attrs.has(name)) {
        return null;
      }
      return this.__attrs.get(name);
    }

    removeAttribute(name) {
      this.__attrs.delete(name);
    }

    dispatchEvent() {
      return true;
    }

    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }

    attachShadow() {
      const root = createFakeNode("shadow-root");
      root.adoptedStyleSheets = [];
      return root;
    }
  }

  class FakeCustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
      this.bubbles = Boolean(init.bubbles);
    }
  }

  globalThis.HTMLElement = FakeHTMLElement;
  globalThis.CustomEvent = FakeCustomEvent;
  globalThis.requestAnimationFrame = (cb) => cb();
  globalThis.CSSStyleSheet = class {
    replaceSync() {}
  };
  globalWindowTarget = createEventTarget();
  globalDocumentTarget = {
    ...createEventTarget(),
    createElement: (tagName) => createFakeNode(tagName),
  };
  globalThis.window = globalWindowTarget;
  globalThis.document = globalDocumentTarget;

  return () => {
    globalThis.HTMLElement = original.HTMLElement;
    globalThis.CustomEvent = original.CustomEvent;
    globalThis.requestAnimationFrame = original.requestAnimationFrame;
    globalThis.CSSStyleSheet = original.CSSStyleSheet;
    globalThis.document = original.document;
    globalThis.window = original.window;
  };
};

const createComponentClass = ({ methods = {}, store = {}, propsSchema = {} } = {}) => {
  return createComponent(
    {
      handlers: {},
      methods,
      constants: {},
      view: {
        elementName: "x-test-component",
        propsSchema: {
          type: "object",
          properties: {
            value: {},
            maxItems: {},
            ...propsSchema,
          },
        },
        template: [{ div: "" }],
        refs: {},
        styles: {},
      },
      store: {
        createInitialState: () => ({
          title: "",
          ready: false,
        }),
        selectViewData: ({ state }) => ({
          title: state.title,
          ready: state.ready,
        }),
        toggleReady: ({ state }, _payload = {}) => {
          state.ready = !state.ready;
        },
        ...store,
      },
      patch: (_oldValue, newValue) => newValue,
      h: (tag, data = {}, children = []) => ({ tag, data, children }),
    },
    {},
  );
};

beforeAll(async () => {
  restoreGlobals = installHTMLElementStubs();
  ({ default: createComponent } = await import("../../src/createComponent.js"));
});

afterAll(() => {
  restoreGlobals?.();
});

describe("createComponent runtime contracts", () => {
  it("binds named methods with payload defaulting to object", () => {
    const TestComponent = createComponentClass({
      methods: {
        ping(payload = {}) {
          return payload.value || "default";
        },
      },
    });

    const instance = new TestComponent();

    expect(instance.ping()).toBe("default");
    expect(instance.ping({ value: "ok" })).toBe("ok");
  });

  it("rejects primitive method payloads", () => {
    const TestComponent = createComponentClass({
      methods: {
        ping(payload = {}) {
          return payload;
        },
      },
    });

    const instance = new TestComponent();

    expect(() => instance.ping("bad")).toThrow(
      "Method 'ping' expects payload to be an object",
    );
  });

  it("rejects methods named default", () => {
    const TestComponent = createComponentClass({
      methods: {
        default: () => "nope",
      },
    });

    expect(() => new TestComponent()).toThrow(
      "Invalid method name 'default'",
    );
  });

  it("enforces object payload for store actions and allows missing payload", () => {
    const TestComponent = createComponentClass({
      store: {
        setTitle: ({ state }, { title }) => {
          state.title = title;
        },
      },
    });

    const instance = new TestComponent();

    expect(() => instance.store.setTitle("bad")).toThrow(
      "Action 'setTitle' expects payload to be an object",
    );

    expect(() => instance.store.toggleReady()).not.toThrow();
  });

  it("resolves props with property-first then attribute fallback", () => {
    const TestComponent = createComponentClass();
    const instance = new TestComponent();

    instance.setAttribute("value", "attrValue");
    expect(instance.props.value).toBe("attrValue");

    instance.value = "propValue";
    expect(instance.props.value).toBe("propValue");

    instance.setAttribute("max-items", "7");
    expect(instance.props.maxItems).toBe("7");
  });

  it("attaches global refs listeners once per mount and cleans up on unmount", () => {
    const TestComponent = createComponent(
      {
        handlers: {
          handleResize: () => {},
        },
        methods: {},
        constants: {},
        view: {
          elementName: "x-global-listener-test",
          propsSchema: {
            type: "object",
            properties: {},
          },
          template: [],
          refs: {
            window: {
              eventListeners: {
                resize: {
                  handler: "handleResize",
                },
              },
            },
          },
          styles: {},
        },
        store: {
          createInitialState: () => ({}),
          selectViewData: () => ({}),
        },
        patch: (_oldValue, newValue) => newValue,
        h: (tag, data = {}, children = []) => ({ tag, data, children }),
      },
      {},
    );
    const instance = new TestComponent();
    instance.render = () => {};

    instance.connectedCallback();
    expect(globalWindowTarget.listenerCount("resize")).toBe(1);

    instance.render();
    instance.render();
    expect(globalWindowTarget.listenerCount("resize")).toBe(1);

    instance.disconnectedCallback();
    expect(globalWindowTarget.listenerCount("resize")).toBe(0);
  });
});
