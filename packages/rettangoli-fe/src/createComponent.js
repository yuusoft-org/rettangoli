import { produce } from "immer";
import { parseView } from "./parser.js";

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
  let css = '';
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


function createAttrsProxy(source) {
  return new Proxy(
    {},
    {
      get(_, prop) {
        if (typeof prop === "string") {
          return source.getAttribute(prop);
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
   * @type {Object}
   */
  attrs;

  /**
   * @type {string}
   */
  cssText;

  get viewData() {
    // TODO decide whether to pass globalStore state
    const data = this.store.toViewData();
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
    this.transformedHandlers = {};
    if (!this.renderTarget.parentNode) {
      this.appendChild(this.renderTarget);
    }
    this.style.display = "contents";
    const deps = {
      ...this.deps,
      refIds: this.refIds,
      getRefIds: () => this.refIds,
      dispatchEvent: this.dispatchEvent.bind(this),
    };

    // TODO don't include onmount, subscriptions, etc in transformedHandlers
    Object.keys(this.handlers || {}).forEach((key) => {
      this.transformedHandlers[key] = (payload) => {
        const result = this.handlers[key](payload, deps);
        return result;
      };
    });

    if (this.handlers?.subscriptions) {
      this.unsubscribeAll = subscribeAll(this.handlers.subscriptions(deps));
    }

    if (this.handlers?.handleOnMount) {
      this._unmountCallback = this.handlers?.handleOnMount(deps);
    }

    this.render();
  }

  disconnectedCallback() {
    if (this._unmountCallback) {
      this._unmountCallback();
    }
    if (this.unsubscribeAll) {
      this.unsubscribeAll();
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
      // const parseStart = performance.now();
      const vDom = parseView({
        h: this.h,
        template: this.template,
        viewData: this.viewData,
        refs: this.refs,
        handlers: this.transformedHandlers,
      });

      // parse through vDom and recursively find all elements with id
      const ids = {};
      const findIds = (vDom) => {
        if (vDom.data?.attrs && vDom.data.attrs.id) {
          ids[vDom.data.attrs.id] = vDom;
        }
        if (vDom.children) {
          vDom.children.forEach(findIds);
        }
      };
      findIds(vDom);
      this.refIds = ids;

      // const parseTime = performance.now() - parseStart;
      // console.log(`parseView took ${parseTime.toFixed(2)}ms`);
      // console.log("vDom", vDom);

      // const patchStart = performance.now();
      if (!this._oldVNode) {
        this._oldVNode = this.patch(this.renderTarget, vDom);
      } else {
        this._oldVNode = this.patch(this._oldVNode, vDom);
      }

      // const patchTime = performance.now() - patchStart;
      // console.log(`patch took ${patchTime.toFixed(2)}ms`);
    } catch (error) {
      console.error("Error during patching:", error);
    }
  };
}

/**
 * Binds store functions with actual framework data flow
 * Makes state changes immutable with immer
 * Passes props to selectors and toViewData
 * @param {*} store
 * @param {*} props
 * @returns
 */
const bindStore = (store, props, attrs) => {
  const { INITIAL_STATE, toViewData, ...selectorsAndActions } = store;
  const selectors = {};
  const actions = {};
  let currentState = structuredClone(INITIAL_STATE);

  Object.entries(selectorsAndActions).forEach(([key, fn]) => {
    if (key.startsWith("select")) {
      selectors[key] = (...args) => {
        return fn({ state: currentState, props, attrs }, ...args);
      };
    } else {
      actions[key] = (payload) => {
        currentState = produce(currentState, (draft) => {
          return fn(draft, payload);
        });
        return currentState;
      };
    }
  });

  return {
    toViewData: () => toViewData({ state: currentState, props, attrs }),
    getState: () => currentState,
    ...actions,
    ...selectors,
  };
};

const createComponent = ({ handlers, view, store, patch, h }, deps) => {
  const { elementName, propsSchema, template, refs, styles } = view;

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

    constructor() {
      super();
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
      this.store = bindStore(store, this.props, createAttrsProxy(this));
      this.template = template;
      this.handlers = handlers;
      this.refs = refs;
      this.patch = patch;
      this.deps = {
        ...deps,
        store: this.store,
        render: this.render,
        handlers,
      };
      this.h = h;
      this.cssText = yamlToCss(elementName, styles);
    }
  }
  return MyComponent;
};

export default createComponent;
