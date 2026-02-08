import { produce } from "immer";
import { parseView } from "./parser.js";
import { parseAndRender } from "jempl";

/**
 * covert this format of json into raw css strings
 * notice if propoperty starts with \@, it will need to nest it
 *
    ':host':
      display: contents
    'button':
      background-color: var(--background)
      font-size: var(--sm-font-size)
      font-weight: var(--sm-font-weight)
      line-height: var(--sm-line-height)
      letter-spacing: var(--sm-letter-spacing)
      border: 1px solid var(--ring)
      border-radius: var(--border-radius-lg)
      padding-left: var(--spacing-md)
      padding-right: var(--spacing-md)
      height: 32px
      color: var(--foreground)
      outline: none
      cursor: pointer
    'button:focus':
      border-color: var(--foreground)
    '@media (min-width: 768px)':
      'button':
        height: 40px
 * @param {*} styleObject
 * @returns
 */
const yamlToCss = (elementName, styleObject) => {
  if (!styleObject || typeof styleObject !== "object") {
    return "";
  }

  let css = ``;
  const convertPropertiesToCss = (properties) => {
    return Object.entries(properties)
      .map(([property, value]) => `  ${property}: ${value};`)
      .join("\n");
  };

  const processSelector = (selector, rules) => {
    if (typeof rules !== "object" || rules === null) {
      return "";
    }

    // Check if this is an @ rule (like @media, @keyframes, etc.)
    if (selector.startsWith("@")) {
      const nestedCss = Object.entries(rules)
        .map(([nestedSelector, nestedRules]) => {
          const nestedProperties = convertPropertiesToCss(nestedRules);
          return `  ${nestedSelector} {\n${nestedProperties
            .split("\n")
            .map((line) => (line ? `  ${line}` : ""))
            .join("\n")}\n  }`;
        })
        .join("\n");

      return `${selector} {\n${nestedCss}\n}`;
    } else {
      // Regular selector
      const properties = convertPropertiesToCss(rules);
      return `${selector} {\n${properties}\n}`;
    }
  };

  // Process all top-level selectors
  Object.entries(styleObject).forEach(([selector, rules]) => {
    const selectorCss = processSelector(selector, rules);
    if (selectorCss) {
      css += (css ? "\n\n" : "") + selectorCss;
    }
  });

  return css;
};

/**
 * Subscribes to all observables and returns a function that will unsubscribe
 * from all observables when called
 * @param {*} observables
 * @returns
 */
const subscribeAll = (observables) => {
  // Subscribe to all observables and store the subscription objects
  const subscriptions = observables.map((observable) => observable.subscribe());

  // Return a function that will unsubscribe from all observables when called
  return () => {
    for (const subscription of subscriptions) {
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    }
  };
};


const isObjectPayload = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const deepFreeze = (value) => {
  if (!isObjectPayload(value) || Object.isFrozen(value)) {
    return value;
  }

  Object.values(value).forEach((nestedValue) => {
    deepFreeze(nestedValue);
  });
  return Object.freeze(value);
};

function createAttrsProxy(source) {
  return new Proxy(
    {},
    {
      get(_, prop) {
        if (typeof prop === "string") {
          const value = source.getAttribute(prop);
          // Return true for boolean attributes (empty string values)
          return value === "" ? true : value;
        }
        return undefined;
      },
      set() {
        throw new Error("Cannot assign to read-only proxy");
      },
      defineProperty() {
        throw new Error("Cannot define properties on read-only proxy");
      },
      deleteProperty() {
        throw new Error("Cannot delete properties from read-only proxy");
      },
      has(_, prop) {
        return typeof prop === "string" && source.hasAttribute(prop);
      },
      ownKeys() {
        return source.getAttributeNames();
      },
      getOwnPropertyDescriptor(_, prop) {
        if (typeof prop === "string" && source.hasAttribute(prop)) {
          return {
            configurable: true,
            enumerable: true,
            get: () => source.getAttribute(prop),
          };
        }
        return undefined;
      },
    },
  );
}

/**
 * Creates a read-only proxy object that only allows access to specified properties from the source object
 * Props are directly attached to the web-component element for example this.title
 * We don't want to expose the whole web compoenent but only want to expose the props
 * createPropsProxy(this, ['title']) will expose only the title
 * @param {Object} source - The source object to create a proxy from
 * @param {string[]} allowedKeys - Array of property names that are allowed to be accessed
 * @returns {Proxy} A read-only proxy object that only allows access to the specified properties
 * @throws {Error} When attempting to modify the proxy object
 */
function createPropsProxy(source, allowedKeys) {
  // return source;
  const allowed = new Set(allowedKeys);
  return new Proxy(
    {},
    {
      get(_, prop) {
        if (typeof prop === "string" && allowed.has(prop)) {
          return source[prop];
        }
        return undefined;
      },
      set() {
        throw new Error("Cannot assign to read-only proxy");
      },
      defineProperty() {
        throw new Error("Cannot define properties on read-only proxy");
      },
      deleteProperty() {
        throw new Error("Cannot delete properties from read-only proxy");
      },
      has(_, prop) {
        return typeof prop === "string" && allowed.has(prop);
      },
      ownKeys() {
        return [...allowed];
      },
      getOwnPropertyDescriptor(_, prop) {
        if (typeof prop === "string" && allowed.has(prop)) {
          return {
            configurable: true,
            enumerable: true,
            get: () => source[prop],
          };
        }
        return undefined;
      },
    },
  );
}

/**
 * Base class for web components
 * Connects web compnent with the rettangoli framework
 */
class BaseComponent extends HTMLElement {

  /**
   * @type {string}
   */
  elementName;

  /**
   * @type {Object}
   */
  styles;

  /**
   * @type {Function}
   */
  h;

  /**
   * @type {Object}
   */
  store;

  /**
   * @type {Object}
   */
  props;

  /**
   * @type {Object}
   */
  propsSchema;

  /**
   * @type {Object}
   */
  template;

  /**
   * @type {Object}
   */
  handlers;

  /**
   * @type {Object}
   */
  methods;

  /**
   * @type {Object}
   */
  constants;

  /**
   * @type {Object}
   */
  transformedHandlers = {};

  /**
   * @type {Object}
   */
  refs;
  refIds = {};
  patch;
  _unmountCallback;
  _oldVNode;
  deps;

  /**
   * @type {string}
   */
  cssText;

  static get observedAttributes() {
    return ["key"];
  }

  get viewData() {
    let data = {};
    if (this.store.selectViewData) {
      data = this.store.selectViewData();
    }
    return data;
  }

  connectedCallback() {
    this.shadow = this.attachShadow({ mode: "open" });

    const commonStyleSheet = new CSSStyleSheet();
    commonStyleSheet.replaceSync(`
      a, a:link, a:visited, a:hover, a:active {
        display: contents;
        color: inherit;
        text-decoration: none;
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        font: inherit;
        cursor: pointer;
      }
    `);

    const adoptedStyleSheets = [commonStyleSheet];

    if (this.cssText) {
      const styleSheet = new CSSStyleSheet();
      styleSheet.replaceSync(this.cssText);
      adoptedStyleSheets.push(styleSheet);
    }
    this.shadow.adoptedStyleSheets = adoptedStyleSheets;
    this.renderTarget = document.createElement("div");
    this.renderTarget.style.cssText = "display: contents;";
    this.shadow.appendChild(this.renderTarget);
    if (!this.renderTarget.parentNode) {
      this.appendChild(this.renderTarget);
    }
    this.style.display = "contents";
    const deps = {
      ...this.deps,
      refs: this.refIds,
      refIds: this.refIds,
      getRefIds: () => this.refIds,
      dispatchEvent: this.dispatchEvent.bind(this),
    };

    this.transformedHandlers = {
      handleCallStoreAction: (payload) => {
        const { render, store } = deps;
        const { _event, _action } = payload;
        const context = parseAndRender(payload, {
          event: _event
        })
        console.log('context', context)
        if (!store[_action]) {
          throw new Error(`store action store.${store._action} is not defined`)
        }
        store[_action](context);
        render();
      }
    };
    // TODO don't include onmount, subscriptions, etc in transformedHandlers
    Object.keys(this.handlers || {}).forEach((key) => {
      this.transformedHandlers[key] = (event, payload) => {
        const result = this.handlers[key](deps, event, payload);
        return result;
      };
    });

    if (this.handlers?.handleBeforeMount) {
      this._unmountCallback = this.handlers?.handleBeforeMount(deps);

      // Validate that handleBeforeMount doesn't return a Promise
      if (this._unmountCallback && typeof this._unmountCallback.then === 'function') {
        throw new Error('handleBeforeMount must be synchronous and cannot return a Promise.');
      }
    }

    this.render();

    if (this.handlers?.handleAfterMount) {
      this.handlers?.handleAfterMount(deps);
    }

    if (this.handlers?.subscriptions) {
      this.unsubscribeAll = subscribeAll(this.handlers.subscriptions(deps));
    }
  }

  disconnectedCallback() {
    if (this._unmountCallback) {
      this._unmountCallback();
    }
    if (this.unsubscribeAll) {
      this.unsubscribeAll();
    }

    const eventRateLimitState = this.transformedHandlers?.__eventRateLimitState;
    if (eventRateLimitState && eventRateLimitState instanceof Map) {
      eventRateLimitState.forEach((state) => {
        if (state && state.debounceTimer) {
          clearTimeout(state.debounceTimer);
        }
      });
      eventRateLimitState.clear();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.render) {
      // Call handleOnUpdate if it exists
      if (this.handlers?.handleOnUpdate) {
        const deps = {
          ...this.deps,
          refs: this.refIds,
          refIds: this.refIds,
          getRefIds: () => this.refIds,
          dispatchEvent: this.dispatchEvent.bind(this),
          store: this.store,
          render: this.render.bind(this),
        };
        const changes = {
          oldAttrs: { [name]: oldValue },
          newAttrs: { [name]: newValue },
          oldProps: deps.props,
          newProps: deps.props,
        };
        this.handlers.handleOnUpdate(deps, changes);
      } else {
        requestAnimationFrame(() => {
          this.render();
        });
      }
    }
  }

  render = () => {
    if (!this.patch) {
      console.error("Patch function is not defined!");
      return;
    }

    if (!this.template) {
      console.error("Template is not defined!");
      return;
    }

    try {
      const deps = {
        ...this.deps,
        refs: this.refIds,
        refIds: this.refIds,
        getRefIds: () => this.refIds,
        dispatchEvent: this.dispatchEvent.bind(this),
        store: this.store,
        render: this.render.bind(this),
      };

      const vDom = parseView({
        h: this.h,
        template: this.template,
        viewData: this.viewData,
        refs: this.refs,
        handlers: this.transformedHandlers,
      });

      if (!this._oldVNode) {
        this._oldVNode = this.patch(this.renderTarget, vDom);
      } else {
        this._oldVNode = this.patch(this._oldVNode, vDom);
      }

      // Collect refs as direct DOM elements keyed by id.
      const ids = {};
      const refKeys = Object.keys(this.refs || {});
      const refMatchers = refKeys.map((refKey) => ({
        isWildcard: refKey.endsWith("*"),
        prefix: refKey.endsWith("*") ? refKey.slice(0, -1) : refKey,
      }));

      const matchesConfiguredRef = (id) => {
        if (!id || refMatchers.length === 0) {
          return false;
        }
        return refMatchers.some((refMatcher) => {
          if (refMatcher.isWildcard) {
            return id.startsWith(refMatcher.prefix);
          }
          return id === refMatcher.prefix;
        });
      };

      const findRefElements = (vNode) => {
        if (!vNode || typeof vNode !== "object") {
          return;
        }
        const id = vNode?.data?.attrs?.id;
        if (id && vNode.elm && matchesConfiguredRef(id)) {
          ids[id] = vNode.elm;
        }
        if (Array.isArray(vNode.children)) {
          vNode.children.forEach(findRefElements);
        }
      };
      findRefElements(this._oldVNode);
      Object.keys(this.refIds).forEach((key) => {
        delete this.refIds[key];
      });
      Object.assign(this.refIds, ids);
    } catch (error) {
      console.error("Error during patching:", error);
    }
  };
}

const bindMethods = (element, methods) => {
  if (!methods || typeof methods !== "object") {
    return;
  }

  Object.entries(methods).forEach(([methodName, methodFn]) => {
    if (methodName === "default") {
      throw new Error(
        "[Methods] Invalid method name 'default'. Use named exports in .methods.js; default export is not supported.",
      );
    }

    if (typeof methodFn !== "function") {
      return;
    }

    if (methodName in element) {
      throw new Error(
        `[Methods] Cannot define method '${methodName}' because it already exists on the component instance.`,
      );
    }

    Object.defineProperty(element, methodName, {
      configurable: true,
      enumerable: false,
      writable: false,
      value: (payload = {}) => {
        const normalizedPayload = payload === undefined ? {} : payload;
        if (!isObjectPayload(normalizedPayload)) {
          throw new Error(
            `[Methods] Method '${methodName}' expects payload to be an object.`,
          );
        }
        return methodFn.call(element, normalizedPayload);
      },
    });
  });
};

/**
 * Binds store functions with actual framework data flow
 * Makes state changes immutable with immer
 * Passes props to selectors
 * @param {*} store
 * @param {*} props
 * @returns
 */
const bindStore = (store, props, attrs, constants) => {
  const { createInitialState, ...selectorsAndActions } = store;
  const selectors = {};
  const actions = {};
  let currentState = {};
  if (createInitialState) {
    currentState = createInitialState({ props, attrs, constants });
  }
  Object.entries(selectorsAndActions).forEach(([key, fn]) => {
    if (key.startsWith("select")) {
      selectors[key] = (...args) => {
        return fn({ state: currentState, props, attrs, constants }, ...args);
      };
    } else {
      actions[key] = (payload = {}) => {
        const normalizedPayload = payload === undefined ? {} : payload;
        if (!isObjectPayload(normalizedPayload)) {
          throw new Error(
            `[Store] Action '${key}' expects payload to be an object.`,
          );
        }
        currentState = produce(currentState, (draft) => {
          return fn({ state: draft, props, attrs, constants }, normalizedPayload);
        });
        return currentState;
      };
    }
  });

  return {
    getState: () => currentState,
    ...actions,
    ...selectors,
  };
};

const createComponent = ({ handlers, methods, constants, view, store, patch, h }, deps) => {
  const { elementName, propsSchema, attrsSchema, template, refs, styles } = view;

  if (!patch) {
    throw new Error("Patch is not defined");
  }

  if (!h) {
    throw new Error("h is not defined");
  }

  if (!view) {
    throw new Error("view is not defined");
  }

  class MyComponent extends BaseComponent {

    static get observedAttributes() {
      const baseAttrs = ["key"];
      const attrKeys = attrsSchema?.properties ? Object.keys(attrsSchema.properties) : [];
      return [...baseAttrs, ...attrKeys];
    }

    constructor() {
      super();
      const attrsProxy = createAttrsProxy(this);
      const setupConstants = isObjectPayload(deps?.constants) ? deps.constants : {};
      const fileConstants = isObjectPayload(constants) ? constants : {};
      this.constants = deepFreeze({
        ...setupConstants,
        ...fileConstants,
      });
      this.propsSchema = propsSchema;
      this.props = propsSchema
        ? createPropsProxy(this, Object.keys(propsSchema.properties))
        : {};
      /**
       * TODO currently if user forgot to define propsSchema for a prop
       * there will be no warning. would be better to shos some warnng
      */
      this.elementName = elementName;
      this.styles = styles;
      this.store = bindStore(store, this.props, attrsProxy, this.constants);
      this.template = template;
      this.handlers = handlers;
      this.methods = methods;
      this.refs = refs;
      this.patch = patch;
      this.deps = {
        ...deps,
        store: this.store,
        render: this.render,
        handlers,
        attrs: attrsProxy,
        props: this.props,
        constants: this.constants,
      };
      bindMethods(this, this.methods);
      this.h = h;
      this.cssText = yamlToCss(elementName, styles);
    }
  }
  return MyComponent;
};

export default createComponent;
