import { parseView } from "./parser.js";
import { parseAndRender } from "jempl";
import { bindMethods } from "./core/runtime/methods.js";
import { bindStore } from "./core/runtime/store.js";
import { resolveConstants } from "./core/runtime/constants.js";
import { yamlToCss } from "./core/style/yamlToCss.js";
import {
  buildOnUpdateChanges,
  createRuntimeDeps,
  createTransformedHandlers,
  runAfterMount,
  runBeforeMount,
} from "./core/runtime/lifecycle.js";
import { collectRefElements } from "./core/runtime/refs.js";
import { attachGlobalRefListeners } from "./core/runtime/globalListeners.js";
import {
  createPropsProxy,
  normalizeAttributeValue,
  toCamelCase,
  toKebabCase,
} from "./core/runtime/props.js";
import { validateSchemaContract } from "./core/schema/validateSchemaContract.js";

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
  _globalListenersCleanup;
  _oldVNode;
  deps;
  _propsSchemaKeys = [];

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
    const deps = createRuntimeDeps({
      baseDeps: this.deps,
      refs: this.refIds,
      dispatchEvent: this.dispatchEvent.bind(this),
      store: this.store,
      render: this.render.bind(this),
    });

    this.transformedHandlers = createTransformedHandlers({
      handlers: this.handlers,
      deps,
      parseAndRenderFn: parseAndRender,
    });

    this._unmountCallback = runBeforeMount({
      handlers: this.handlers,
      deps,
    });

    this._globalListenersCleanup = attachGlobalRefListeners({
      refs: this.refs,
      handlers: this.transformedHandlers,
      parseAndRenderFn: parseAndRender,
    });

    this.render();

    runAfterMount({
      handlers: this.handlers,
      deps,
    });

  }

  disconnectedCallback() {
    if (this._unmountCallback) {
      this._unmountCallback();
    }
    if (this._globalListenersCleanup) {
      this._globalListenersCleanup();
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
        const deps = createRuntimeDeps({
          baseDeps: this.deps,
          refs: this.refIds,
          dispatchEvent: this.dispatchEvent.bind(this),
          store: this.store,
          render: this.render.bind(this),
        });
        const changes = buildOnUpdateChanges({
          attributeName: name,
          oldValue,
          newValue,
          deps,
          propsSchemaKeys: this._propsSchemaKeys,
          toCamelCase,
          normalizeAttributeValue,
        });
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
      const ids = collectRefElements({
        rootVNode: this._oldVNode,
        refs: this.refs,
      });
      Object.keys(this.refIds).forEach((key) => {
        delete this.refIds[key];
      });
      Object.assign(this.refIds, ids);
    } catch (error) {
      console.error("Error during patching:", error);
    }
  };
}

const createComponent = ({ handlers, methods, constants, schema, view, store, patch, h }, deps) => {
  if (!view) {
    throw new Error("view is not defined");
  }

  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error("schema is required. Define component metadata in .schema.yaml.");
  }

  const resolvedSchema = schema;
  const { template, refs, styles } = view;
  validateSchemaContract({
    schema: resolvedSchema,
    methodExports: Object.keys(methods || {}),
  });
  const elementName = resolvedSchema.componentName;
  const propsSchema = resolvedSchema.propsSchema;
  const propsSchemaKeys = propsSchema?.properties
    ? [...new Set(Object.keys(propsSchema.properties).map((propKey) => toCamelCase(propKey)))]
    : [];

  if (!patch) {
    throw new Error("Patch is not defined");
  }

  if (!h) {
    throw new Error("h is not defined");
  }

  class MyComponent extends BaseComponent {

    static get observedAttributes() {
      const observedAttrs = new Set(["key"]);
      propsSchemaKeys.forEach((propKey) => {
        observedAttrs.add(propKey);
        observedAttrs.add(toKebabCase(propKey));
      });
      return [...observedAttrs];
    }

    constructor() {
      super();
      this.constants = resolveConstants({
        setupConstants: deps?.constants,
        fileConstants: constants,
      });
      this.propsSchema = propsSchema;
      this.props = propsSchema
        ? createPropsProxy(this, propsSchemaKeys)
        : {};
      this._propsSchemaKeys = propsSchemaKeys;
      /**
       * TODO currently if user forgot to define propsSchema for a prop
       * there will be no warning. would be better to shos some warnng
      */
      this.elementName = elementName;
      this.styles = styles;
      this.store = bindStore(store, this.props, this.constants);
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
