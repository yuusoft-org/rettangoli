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
  // jsdom has no constructable stylesheets, which a component adopts when it
  // connects. docs/testing.md tells consumers to stub it the same way.
  vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
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

  it("rejects a config with no schema", () => {
    expect(() =>
      createComponent({ view: { template: parseTemplate([]), refs: {}, styles: {} } }, {}),
    ).toThrow("schema is required. Define component metadata in .schema.yaml.");
  });
});
