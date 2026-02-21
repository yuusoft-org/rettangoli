import { parse } from "jempl";
import { bindMethods } from "../src/core/runtime/methods.js";
import { bindStore } from "../src/core/runtime/store.js";
import { resolveConstants } from "../src/core/runtime/constants.js";

const installDomGlobals = () => {
  class FakeHTMLElement {
    static __rtglFake = true;

    constructor() {
      this.__attrs = new Map();
      this.children = [];
      this.style = {};
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

    appendChild(child) {
      if (child && typeof child === "object") {
        child.parentNode = this;
      }
      this.children.push(child);
      return child;
    }

    attachShadow() {
      const shadowRoot = {
        adoptedStyleSheets: [],
        children: [],
        appendChild(child) {
          if (child && typeof child === "object") {
            child.parentNode = this;
          }
          this.children.push(child);
          return child;
        },
      };
      this.shadowRoot = shadowRoot;
      return shadowRoot;
    }

    dispatchEvent() {
      return true;
    }

    querySelector() {
      return null;
    }
  }

  class FakeCustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
      this.bubbles = Boolean(init.bubbles);
    }
  }

  class FakeCSSStyleSheet {
    replaceSync() {}
  }

  globalThis.HTMLElement = FakeHTMLElement;
  globalThis.CustomEvent = FakeCustomEvent;
  globalThis.CSSStyleSheet = FakeCSSStyleSheet;
  globalThis.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  globalThis.document = {
    createElement() {
      return {
        style: {},
        children: [],
        parentNode: null,
        appendChild(child) {
          if (child && typeof child === "object") {
            child.parentNode = this;
          }
          this.children.push(child);
          return child;
        },
      };
    },
  };
  globalThis.window = globalThis;
};

installDomGlobals();

const { default: createComponent } = await import("../src/createComponent.js");

const template = parse([{ div: "" }]);

const defaultStore = {
  createInitialState: ({ constants }) => ({
    title: constants?.labels?.defaultTitle || "",
    maxItems: constants?.limits?.maxItems || 50,
    ready: false,
    items: [
      { id: 1, category: "work", done: false },
      { id: 2, category: "home", done: true },
      { id: 3, category: "work", done: true },
    ],
  }),
  selectItemsByCategory: ({ state }, category) =>
    state.items.filter((item) => item.category === category),
  selectItemsByFilters: ({ state }, filters = {}) => {
    return state.items.filter((item) => {
      if (filters.category && item.category !== filters.category) {
        return false;
      }
      if (typeof filters.done === "boolean" && item.done !== filters.done) {
        return false;
      }
      return true;
    });
  },
  selectViewData: ({ state, constants }) => ({
    title: state.title,
    maxItems: state.maxItems,
    ready: state.ready,
    submitLabel: constants?.labels?.submit || "Submit",
  }),
  setTitle: ({ state }, { title }) => {
    state.title = title;
  },
  toggleReady: ({ state }, _payload = {}) => {
    state.ready = !state.ready;
  },
};

const createTestComponentClass = ({
  handlers = {},
  methods = {},
  constants = {},
  setupDeps = {},
  store = {},
  propsSchema = {},
} = {}) => {
  return createComponent(
    {
      handlers,
      methods,
      constants,
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
        ...defaultStore,
        ...store,
      },
    },
    setupDeps,
  );
};

export const runStoreCase = ({ scenario }) => {
  const store = bindStore(defaultStore, {}, {
    labels: { submit: "Submit" },
    limits: { maxItems: 50 },
  });

  if (scenario === "action_allows_missing_payload") {
    store.toggleReady();
    return {
      ready: store.getState().ready,
    };
  }

  if (scenario === "action_rejects_primitive_payload") {
    store.setTitle("hello");
    return true;
  }

  if (scenario === "selector_supports_primitive_second_arg") {
    return {
      count: store.selectItemsByCategory("work").length,
    };
  }

  if (scenario === "selector_supports_object_second_arg") {
    return {
      count: store.selectItemsByFilters({
        category: "work",
        done: true,
      }).length,
    };
  }

  throw new Error(`Unknown store scenario '${scenario}'.`);
};

export const runMethodsCase = ({ scenario }) => {
  if (scenario === "default_payload_object") {
    const element = {
      tagName: "X-TEST-COMPONENT",
    };
    bindMethods(element, {
      ping(payload = {}) {
        return payload.value || "default";
      },
    });
    return {
      result: element.ping(),
    };
  }

  if (scenario === "this_binding") {
    const element = {
      tagName: "X-TEST-COMPONENT",
    };
    bindMethods(element, {
      whoAmI(_payload = {}) {
        return this.tagName;
      },
    });
    return {
      tagName: element.whoAmI(),
    };
  }

  if (scenario === "rejects_primitive_payload") {
    const element = {
      tagName: "X-TEST-COMPONENT",
    };
    bindMethods(element, {
      ping(payload = {}) {
        return payload;
      },
    });
    element.ping("bad");
    return true;
  }

  if (scenario === "rejects_default_named_export") {
    const element = {
      tagName: "X-TEST-COMPONENT",
    };
    bindMethods(element, {
      default() {
        return "invalid";
      },
    });
    return true;
  }

  throw new Error(`Unknown methods scenario '${scenario}'.`);
};

export const runConstantsCase = ({ scenario }) => {
  if (scenario === "merge_and_precedence") {
    const constants = resolveConstants({
      setupConstants: {
        labels: { submit: "Setup Submit", defaultTitle: "Setup Title" },
        limits: { maxItems: 5 },
        flags: { fromSetup: true },
      },
      fileConstants: {
        labels: { submit: "File Submit" },
        limits: { maxItems: 10 },
      },
    });
    return {
      submit: constants.labels.submit,
      maxItems: constants.limits.maxItems,
      fromSetup: constants.flags.fromSetup,
    };
  }

  if (scenario === "injected_into_store_context") {
    const constants = resolveConstants({
      setupConstants: undefined,
      fileConstants: {
        labels: { submit: "Confirm" },
        limits: { maxItems: 77 },
      },
    });
    const store = bindStore(defaultStore, {}, constants);
    return {
      maxItems: store.getState().maxItems,
      submitLabel: store.selectViewData().submitLabel,
    };
  }

  if (scenario === "deep_frozen") {
    const constants = resolveConstants({
      setupConstants: undefined,
      fileConstants: {
        labels: { submit: "Confirm" },
        limits: { maxItems: 10 },
      },
    });
    return {
      rootFrozen: Object.isFrozen(constants),
      labelsFrozen: Object.isFrozen(constants.labels),
      limitsFrozen: Object.isFrozen(constants.limits),
    };
  }

  if (scenario === "non_object_constants_ignored") {
    const constants = resolveConstants({
      setupConstants: undefined,
      fileConstants: "invalid",
    });
    return {
      keyCount: Object.keys(constants).length,
    };
  }

  throw new Error(`Unknown constants scenario '${scenario}'.`);
};

export const runHandlersCase = ({ scenario }) => {
  if (scenario === "before_mount_rejects_promise") {
    const TestComponent = createTestComponentClass({
      handlers: {
        handleBeforeMount: async () => {},
      },
    });
    const instance = new TestComponent();
    instance.render = () => {};
    instance.connectedCallback();
    return true;
  }

  if (scenario === "before_mount_cleanup_runs") {
    let cleaned = false;
    const TestComponent = createTestComponentClass({
      handlers: {
        handleBeforeMount: () => {
          return () => {
            cleaned = true;
          };
        },
      },
    });
    const instance = new TestComponent();
    instance.render = () => {};
    instance.connectedCallback();
    instance.disconnectedCallback();
    return {
      cleaned,
    };
  }

  if (scenario === "after_mount_allows_async") {
    let called = false;
    const TestComponent = createTestComponentClass({
      handlers: {
        handleAfterMount: async () => {
          called = true;
        },
      },
    });
    const instance = new TestComponent();
    instance.render = () => {};
    instance.connectedCallback();
    return {
      called,
    };
  }

  if (scenario === "on_update_payload_uses_camel_case_changed_prop") {
    let received = null;
    const TestComponent = createTestComponentClass({
      handlers: {
        handleOnUpdate: (_deps, payload) => {
          received = payload;
        },
      },
    });
    const instance = new TestComponent();
    instance.attributeChangedCallback("max-items", "1", "2");

    return {
      changedProp: received.changedProp,
      oldValue: received.oldProps.maxItems,
      newValue: received.newProps.maxItems,
    };
  }

  throw new Error(`Unknown handlers scenario '${scenario}'.`);
};
