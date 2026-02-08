import { afterAll, beforeAll, describe, expect, it } from "vitest";

let createComponent;
let restoreGlobals;

const installHTMLElementStubs = () => {
  const original = {
    HTMLElement: globalThis.HTMLElement,
    CustomEvent: globalThis.CustomEvent,
    requestAnimationFrame: globalThis.requestAnimationFrame,
  };

  class FakeHTMLElement {
    constructor() {
      this.__attrs = new Map();
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

  return () => {
    globalThis.HTMLElement = original.HTMLElement;
    globalThis.CustomEvent = original.CustomEvent;
    globalThis.requestAnimationFrame = original.requestAnimationFrame;
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
});
