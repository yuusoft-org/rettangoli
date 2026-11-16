// @vitest-environment jsdom
/**
 * `createComponent` from `@rettangoli/fe/testing`, where it can run: it
 * returns a class that extends `HTMLElement`, so calling it needs a DOM.
 * Everything else the entry exports is covered without one in
 * `testing-entry.test.js`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createComponent, parseTemplate } from "../../src/testing/index.js";

let componentNumber = 0;

const defineCounter = ({ handlers = { handleClick: () => {} }, deps = {} } = {}) => {
  const name = `x-testing-counter-${componentNumber++}`;
  const componentClass = createComponent(
    {
      schema: {
        componentName: name,
        propsSchema: { type: "object", properties: { start: {} } },
      },
      view: {
        template: parseTemplate([
          { "p#count": "${count}" },
          { "button#addButton": "Add" },
          { "button#handledButton": "Handled" },
        ]),
        refs: {
          addButton: { eventListeners: { click: { action: "increment", payload: { by: 2 } } } },
          handledButton: { eventListeners: { click: { handler: "handleClick" } } },
        },
        styles: {},
      },
      store: {
        createInitialState: ({ props }) => ({ count: Number(props.start ?? 0) }),
        selectViewData: ({ state }) => ({ count: state.count }),
        increment: ({ state }, { by = 1 }) => {
          state.count += by;
        },
      },
      handlers,
    },
    deps,
  );
  customElements.define(name, componentClass);
  return { name, componentClass };
};

const mount = (name, attributes = {}) => {
  const element = document.createElement(name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return document.body.appendChild(element);
};

const text = (element, id) => element.renderTarget.querySelector(`#${id}`).textContent;

beforeEach(() => {
  // A component adopts constructable stylesheets when it connects. The jsdom
  // this package tests with has none; newer ones do, and reject a stand-in.
  // docs/testing.md tells consumers to stub it the same way.
  if (typeof globalThis.CSSStyleSheet?.prototype.replaceSync !== "function") {
    vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
  }
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("createComponent from the testing entry", () => {
  it("returns an HTMLElement subclass", () => {
    const { componentClass } = defineCounter();
    expect(typeof componentClass).toBe("function");
    expect(componentClass.prototype).toBeInstanceOf(HTMLElement);
  });

  it("renders the view from the store when the element connects", () => {
    const { name } = defineCounter();
    const element = mount(name, { start: "5" });
    expect(text(element, "count")).toBe("5");
    expect(element.store.getState()).toEqual({ count: 5 });
  });

  it("runs an action listener and renders by itself", () => {
    const { name } = defineCounter();
    const element = mount(name);
    element.renderTarget.querySelector("#addButton").click();
    expect(element.store.getState()).toEqual({ count: 2 });
    expect(text(element, "count")).toBe("2");
  });

  it("runs a handler with deps; the handler renders, not the runtime", () => {
    const authService = { name: "auth" };
    const handleClick = vi.fn((deps) => {
      deps.store.increment({ by: 10 });
    });
    const { name } = defineCounter({ handlers: { handleClick }, deps: { authService } });
    const element = mount(name);

    element.renderTarget.querySelector("#handledButton").click();

    expect(handleClick).toHaveBeenCalledTimes(1);
    const [deps, payload] = handleClick.mock.calls[0];
    expect(deps.authService).toBe(authService);
    expect(payload._event.type).toBe("click");
    // The action ran, but nothing rendered: the handler did not call render().
    expect(element.store.getState()).toEqual({ count: 10 });
    expect(text(element, "count")).toBe("0");

    element.render();
    expect(text(element, "count")).toBe("10");
  });

  it("passes constants to the store and to handlers", () => {
    const name = `x-testing-constants-${componentNumber++}`;
    const handleClick = vi.fn();
    customElements.define(name, createComponent(
      {
        schema: { componentName: name },
        view: {
          template: parseTemplate([{ "button#unitButton": "${label}" }]),
          refs: { unitButton: { eventListeners: { click: { handler: "handleClick" } } } },
          styles: {},
        },
        constants: { unit: "kg", limits: { max: 3 } },
        store: {
          createInitialState: ({ constants }) => ({ max: constants.limits.max }),
          selectViewData: ({ state, constants }) => ({ label: `${state.max} ${constants.unit}` }),
        },
        handlers: { handleClick },
      },
      {},
    ));
    const element = mount(name);

    expect(text(element, "unitButton")).toBe("3 kg");
    element.renderTarget.querySelector("#unitButton").click();
    expect(handleClick.mock.calls[0][0].constants).toEqual({ unit: "kg", limits: { max: 3 } });
  });

  describe("methods", () => {
    const defineWithMethods = ({ schemaMethods = { increment: {}, describe: {} } } = {}) => {
      const name = `x-testing-methods-${componentNumber++}`;
      const componentClass = createComponent(
        {
          schema: {
            componentName: name,
            methods: { type: "object", properties: schemaMethods },
          },
          view: { template: parseTemplate([{ "p#count": "${count}" }]), refs: {}, styles: {} },
          constants: { unit: "kg" },
          store: {
            createInitialState: () => ({ count: 0 }),
            selectViewData: ({ state }) => ({ count: state.count }),
            increment: ({ state }, { by = 1 }) => {
              state.count += by;
            },
          },
          methods: {
            increment(payload = {}) {
              this.store.increment(payload);
              this.render();
              return this.store.getState().count;
            },
            describe() {
              return `${this.localName} in ${this.constants.unit}`;
            },
          },
        },
        {},
      );
      customElements.define(name, componentClass);
      return name;
    };

    it("puts each method on the element, bound to it", () => {
      const name = defineWithMethods();
      const element = mount(name);

      expect(element.increment({ by: 4 })).toBe(4);
      expect(text(element, "count")).toBe("4");
      expect(element.increment()).toBe(5);
      expect(element.describe()).toBe(`${name} in kg`);
    });

    it("rejects a payload that is not an object", () => {
      const element = mount(defineWithMethods());
      expect(() => element.increment(4)).toThrow();
      expect(element.store.getState()).toEqual({ count: 0 });
    });

    it("rejects a schema that declares methods the component does not export", () => {
      expect(() => defineWithMethods({ schemaMethods: { increment: {}, describe: {}, reset: {} } }))
        .toThrow(/reset/);
    });
  });

  it("rejects a config with no schema", () => {
    expect(() =>
      createComponent({ view: { template: parseTemplate([]), refs: {}, styles: {} } }, {}),
    ).toThrow("schema is required. Define component metadata in .schema.yaml.");
  });
});
