import { parse } from "jempl";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let createComponent;
let restoreGlobals;
let globalWindowTarget;
let globalDocumentTarget;
const template = parse([{ div: "" }]);

const createEventTarget = () => {
  const target = new EventTarget();
  const counts = new Map();
  const originalAdd = target.addEventListener.bind(target);
  const originalRemove = target.removeEventListener.bind(target);
  target.addEventListener = (eventType, listener, options) => {
    counts.set(eventType, (counts.get(eventType) || 0) + 1);
    return originalAdd(eventType, listener, options);
  };
  target.removeEventListener = (eventType, listener, options) => {
    counts.set(eventType, Math.max(0, (counts.get(eventType) || 0) - 1));
    return originalRemove(eventType, listener, options);
  };
  target.listenerCount = (eventType) => counts.get(eventType) || 0;
  return target;
};

const linkSiblings = (children) => {
  children.forEach((child, index) => {
    child.previousSibling = children[index - 1] || null;
    child.nextSibling = children[index + 1] || null;
  });
};

const createFakeNode = (tagName = "div", nodeType = 1) => {
  const node = {
    tagName,
    nodeType,
    __attrs: new Map(),
    children: [],
    childNodes: [],
    style: { cssText: "" },
    parentNode: null,
    previousSibling: null,
    nextSibling: null,
    textContent: "",
    setAttribute(name, value) {
      this.__attrs.set(name, String(value));
    },
    getAttribute(name) {
      if (!this.__attrs.has(name)) {
        return null;
      }
      return this.__attrs.get(name);
    },
    removeAttribute(name) {
      this.__attrs.delete(name);
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      this.childNodes = this.children;
      linkSiblings(this.children);
      return child;
    },
    insertBefore(child, referenceNode) {
      child.parentNode = this;
      const index = referenceNode ? this.children.indexOf(referenceNode) : -1;
      if (index === -1) {
        this.children.push(child);
      } else {
        this.children.splice(index, 0, child);
      }
      this.childNodes = this.children;
      linkSiblings(this.children);
      return child;
    },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index !== -1) {
        this.children.splice(index, 1);
        child.parentNode = null;
      }
      this.childNodes = this.children;
      linkSiblings(this.children);
      return child;
    },
    get firstChild() {
      return this.children[0] || null;
    },
    get lastChild() {
      return this.children[this.children.length - 1] || null;
    },
  };

  return node;
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
      this.childNodes = this.children;
      this.style = {};
      this.parentNode = null;
      this.previousSibling = null;
      this.nextSibling = null;
      this.nodeType = 1;
      this.tagName = "X-TEST-COMPONENT";
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
      this.childNodes = this.children;
      linkSiblings(this.children);
      return child;
    }

    attachShadow() {
      const root = createFakeNode("shadow-root", 11);
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
  globalDocumentTarget = createEventTarget();
  globalDocumentTarget.createElement = (tagName) => createFakeNode(tagName);
  globalDocumentTarget.createElementNS = (_namespace, tagName) => createFakeNode(tagName);
  globalDocumentTarget.createDocumentFragment = () => createFakeNode("#document-fragment", 11);
  globalDocumentTarget.createTextNode = (text) => ({
    nodeType: 3,
    textContent: String(text),
    parentNode: null,
    previousSibling: null,
    nextSibling: null,
  });
  globalDocumentTarget.createComment = (text) => ({
    nodeType: 8,
    textContent: String(text),
    parentNode: null,
    previousSibling: null,
    nextSibling: null,
  });
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

const createComponentClass = ({
  handlers = {},
  methods = {},
  store = {},
  propsSchema = {},
} = {}) => {
  return createComponent(
    {
      handlers,
      methods,
      constants: {},
      schema: {
        componentName: "x-test-component",
        propsSchema: {
          type: "object",
          properties: {
            value: {},
            maxItems: {},
            ...propsSchema,
          },
        },
      },
      view: {
        template,
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

  it("normalizes attribute-form props and still prefers direct property values", () => {
    const TestComponent = createComponentClass({
      propsSchema: {
        submitLabel: {},
      },
    });
    const instance = new TestComponent();

    instance.setAttribute("submit-label", "Submit");
    expect(instance.props.submitLabel).toBe("Submit");

    instance.submitLabel = "Save";
    expect(instance.props.submitLabel).toBe("Save");
  });

  it("re-renders when a schema property is assigned after mount", () => {
    const TestComponent = createComponentClass();
    const instance = new TestComponent();

    instance.connectedCallback();

    const renderSpy = vi.spyOn(instance, "render");

    instance.value = "updated";

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(instance.props.value).toBe("updated");
  });

  it("reuses the existing shadow root when the element reconnects", () => {
    const TestComponent = createComponentClass();
    const instance = new TestComponent();
    const originalAttachShadow = instance.attachShadow.bind(instance);
    const attachShadowSpy = vi.fn((options) => {
      if (instance.shadowRoot) {
        throw new Error("attachShadow called twice");
      }

      const shadow = originalAttachShadow(options);
      instance.shadowRoot = shadow;
      return shadow;
    });

    instance.attachShadow = attachShadowSpy;

    expect(() => {
      instance.connectedCallback();
      instance.disconnectedCallback();
      instance.connectedCallback();
    }).not.toThrow();

    expect(attachShadowSpy).toHaveBeenCalledTimes(1);
    expect(instance.renderTarget.parentNode).toBe(instance.shadowRoot);
  });

  it("routes post-mount property writes through handleOnUpdate", () => {
    const handleOnUpdate = vi.fn();
    const TestComponent = createComponentClass({
      handlers: {
        handleOnUpdate,
      },
    });
    const instance = new TestComponent();

    instance.connectedCallback();

    instance.value = "updated";

    expect(handleOnUpdate).toHaveBeenCalledTimes(1);
    expect(handleOnUpdate.mock.calls[0][1]).toEqual({
      changedProp: "value",
      oldProps: {},
      newProps: { value: "updated" },
    });
  });

  it("uses schema propsSchema when view propsSchema is absent", () => {
    const TestComponent = createComponent(
      {
        handlers: {},
        methods: {},
        constants: {},
        schema: {
          componentName: "x-schema-props",
          propsSchema: {
            type: "object",
            properties: {
              maxItems: {},
            },
          },
        },
        view: {
          elementName: "x-schema-props",
          template,
          refs: {},
          styles: {},
        },
        store: {
          createInitialState: () => ({}),
          selectViewData: () => ({}),
        },

      },
      {},
    );

    const instance = new TestComponent();
    instance.setAttribute("max-items", "7");
    expect(instance.props.maxItems).toBe("7");
  });

  it("ignores view propsSchema when schema propsSchema is provided", () => {
    const TestComponent = createComponent(
      {
        handlers: {},
        methods: {},
        constants: {},
        schema: {
          componentName: "x-schema-wins",
          propsSchema: {
            type: "object",
            properties: {
              maxItems: {},
            },
          },
        },
        view: {
          elementName: "x-view-ignored",
          propsSchema: {
            type: "object",
            properties: {
              title: {},
            },
          },
          template,
          refs: {},
          styles: {},
        },
        store: {
          createInitialState: () => ({}),
          selectViewData: () => ({}),
        },

      },
      {},
    );

    const instance = new TestComponent();
    instance.setAttribute("max-items", "7");
    instance.setAttribute("title", "hello");
    expect(instance.props.maxItems).toBe("7");
    expect(instance.props.title).toBeUndefined();
  });

  it("requires schema", () => {
    expect(() => createComponent(
      {
        handlers: {},
        methods: {},
        constants: {},
        view: {
          template: [],
          refs: {},
          styles: {},
        },
        store: {
          createInitialState: () => ({}),
          selectViewData: () => ({}),
        },

      },
      {},
    )).toThrow("schema is required");
  });

  it("validates schema methods against methods exports", () => {
    expect(() => createComponent(
      {
        handlers: {},
        methods: {},
        constants: {},
        schema: {
          componentName: "x-schema-methods",
          methods: {
            type: "object",
            properties: {
              focusInput: {
                description: "Focuses the primary input field",
              },
            },
          },
        },
        view: {
          elementName: "x-schema-methods",
          propsSchema: {
            type: "object",
            properties: {},
          },
          template,
          refs: {},
          styles: {},
        },
        store: {
          createInitialState: () => ({}),
          selectViewData: () => ({}),
        },

      },
      {},
    )).toThrow("missing in .methods.js exports");
  });

  it("attaches global refs listeners once per mount and cleans up on unmount", () => {
    let resizeCalls = 0;
    let visibilityCalls = 0;
    const TestComponent = createComponent(
      {
        handlers: {
          handleResize: (_deps, payload = {}) => {
            if (payload._event?.type === "resize") {
              resizeCalls += 1;
            }
          },
          handleVisibilityChange: (_deps, payload = {}) => {
            if (payload._event?.type === "visibilitychange") {
              visibilityCalls += 1;
            }
          },
        },
        methods: {},
        constants: {},
        schema: {
          componentName: "x-global-listener-test",
          propsSchema: {
            type: "object",
            properties: {},
          },
        },
        view: {
          template: [],
          refs: {
            window: {
              eventListeners: {
                resize: {
                  handler: "handleResize",
                },
              },
            },
            document: {
              eventListeners: {
                visibilitychange: {
                  handler: "handleVisibilityChange",
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

      },
      {},
    );
    const instance = new TestComponent();
    instance.render = () => {};

    instance.connectedCallback();
    expect(globalWindowTarget.listenerCount("resize")).toBe(1);
    expect(globalDocumentTarget.listenerCount("visibilitychange")).toBe(1);

    globalWindowTarget.dispatchEvent(new Event("resize"));
    globalDocumentTarget.dispatchEvent(new Event("visibilitychange"));
    expect(resizeCalls).toBe(1);
    expect(visibilityCalls).toBe(1);

    instance.render();
    instance.render();
    expect(globalWindowTarget.listenerCount("resize")).toBe(1);
    expect(globalDocumentTarget.listenerCount("visibilitychange")).toBe(1);

    instance.disconnectedCallback();
    expect(globalWindowTarget.listenerCount("resize")).toBe(0);
    expect(globalDocumentTarget.listenerCount("visibilitychange")).toBe(0);
  });
});
