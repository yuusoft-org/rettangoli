import { produce } from "immer";
import { parseView } from "./parser.js";

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
        if (allowed.has(prop)) {
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
        return allowed.has(prop);
      },
      ownKeys() {
        return [...allowed];
      },
      getOwnPropertyDescriptor(_, prop) {
        if (allowed.has(prop)) {
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
  constructor() {
    super();
    // Create a div that will be used to render the component because snabbdom needs a DOM node to patch
    this.renderTarget = document.createElement("div");
    this.renderTarget.style.cssText = "display: contents;";

    this.transformedHandlers = {};
  }

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

  get viewData() {
    // TODO decide whether to pass globalStore state
    const data = this.store.toViewData();
    return data;
  }

  connectedCallback() {
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

    requestAnimationFrame(() => {
      this.render();
    });
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
        if (vDom.data.attrs && vDom.data.attrs.id) {
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

      const patchStart = performance.now();
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
const bindStore = (store, props) => {
  const { INITIAL_STATE, toViewData, ...selectorsAndActions } = store;
  const selectors = {};
  const actions = {};
  let currentState = structuredClone(INITIAL_STATE);

  Object.entries(selectorsAndActions).forEach(([key, fn]) => {
    if (key.startsWith("select")) {
      selectors[key] = (...args) => {
        return fn({ state: currentState, props }, ...args);
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
    toViewData: () => toViewData({ state: currentState, props }),
    getState: () => currentState,
    ...actions,
    ...selectors,
  };
};

const createComponent = ({ handlers, view, store, patch, h }, deps) => {
  const { propsSchema, template, refs } = view;

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
      this.store = bindStore(store, this.props);
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
    }
  }
  return MyComponent;
};

export default createComponent;
