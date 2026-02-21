import { parseAndRender } from "jempl";
import { bindMethods } from "../core/runtime/methods.js";
import { bindStore } from "../core/runtime/store.js";
import { resolveConstants } from "../core/runtime/constants.js";
import { yamlToCss } from "../core/style/yamlToCss.js";
import {
  runAttributeChangedComponentLifecycle,
  runConnectedComponentLifecycle,
  runDisconnectedComponentLifecycle,
  runRenderComponentLifecycle,
} from "../core/runtime/componentOrchestrator.js";
import { attachGlobalRefListeners } from "../core/runtime/globalListeners.js";
import { createPropsProxy, toKebabCase } from "../core/runtime/props.js";
import {
  buildObservedAttributes,
} from "../core/runtime/componentRuntime.js";
import { createTuiComponentUpdateHook } from "./componentUpdateHook.js";
import { scheduleFrame } from "./scheduler.js";
import { renderVNodeToString } from "./renderer.js";
import { createTuiEventTargets } from "./eventTargets.js";

const identityDispatchEvent = () => true;

export const createTuiComponentClass = ({
  elementName,
  propsSchema,
  propsSchemaKeys,
  template,
  refs,
  styles,
  handlers,
  methods,
  constants,
  store,
  patch,
  h,
  deps,
}) => {
  class BaseComponent {
    elementName;
    styles;
    _snabbdomH;
    store;
    props;
    propsSchema;
    template;
    handlers;
    methods;
    constants;
    transformedHandlers = {};
    refs;
    refIds = {};
    patch;
    _unmountCallback;
    _globalListenersCleanup;
    _oldVNode;
    deps;
    _propsSchemaKeys = [];
    cssText;
    output = "";
    renderTarget;
    _isMounted = false;
    _attributes = new Map();
    _eventTargets = createTuiEventTargets();

    static get observedAttributes() {
      return ["key"];
    }

    constructor() {
      this.renderTarget = { type: "tui-root" };
    }

    get viewData() {
      let data = {};
      if (this.store.selectViewData) {
        data = this.store.selectViewData();
      }
      return data;
    }

    getAttribute(name) {
      return this._attributes.has(name)
        ? this._attributes.get(name)
        : null;
    }

    hasAttribute(name) {
      return this._attributes.has(name);
    }

    setAttribute(name, value = "") {
      const oldValue = this.getAttribute(name);
      const nextValue = value === true ? "" : String(value);
      this._attributes.set(name, nextValue);
      if (oldValue !== nextValue) {
        this.attributeChangedCallback(name, oldValue, nextValue);
      }
    }

    removeAttribute(name) {
      const oldValue = this.getAttribute(name);
      if (oldValue === null) {
        return;
      }
      this._attributes.delete(name);
      this.attributeChangedCallback(name, oldValue, null);
    }

    dispatchEvent(event) {
      return identityDispatchEvent(event);
    }

    connectedCallback() {
      this._isMounted = true;
      runConnectedComponentLifecycle({
        instance: this,
        parseAndRenderFn: parseAndRender,
        renderFn: this.render,
        attachGlobalRefListenersFn: (options) => {
          return attachGlobalRefListeners({
            ...options,
            targets: this._eventTargets,
          });
        },
      });
    }

    disconnectedCallback() {
      this._isMounted = false;
      runDisconnectedComponentLifecycle({
        instance: this,
        clearTimerFn: clearTimeout,
      });
    }

    attributeChangedCallback(name, oldValue, newValue) {
      runAttributeChangedComponentLifecycle({
        instance: this,
        attributeName: name,
        oldValue,
        newValue,
        scheduleFrameFn: scheduleFrame,
      });
    }

    setProps(nextProps = {}) {
      Object.entries(nextProps).forEach(([propName, propValue]) => {
        this[propName] = propValue;
      });
      this.render();
    }

    mount() {
      this.connectedCallback();
      return this;
    }

    render = () => {
      const nextVNode = runRenderComponentLifecycle({
        instance: this,
        createComponentUpdateHookFn: createTuiComponentUpdateHook,
      });

      if (!nextVNode) {
        this.output = "";
        return this.output;
      }

      this.output = renderVNodeToString({
        vNode: nextVNode,
        components: this.deps?.components || {},
      });

      return this.output;
    };

    toString() {
      if (!this._isMounted) {
        this.connectedCallback();
      }
      return this.output;
    }
  }

  class TuiComponent extends BaseComponent {
    static get observedAttributes() {
      return buildObservedAttributes({
        propsSchemaKeys,
        toKebabCase,
      });
    }

    constructor() {
      super();
      const bootstrapAttributes = this.constructor.__rtglBootstrapAttributes || {};
      Object.entries(bootstrapAttributes).forEach(([name, value]) => {
        this._attributes.set(name, value === true ? "" : String(value));
      });
      const bootstrapProps = this.constructor.__rtglBootstrapProps || {};
      Object.entries(bootstrapProps).forEach(([name, value]) => {
        this[name] = value;
      });
      this.constants = resolveConstants({
        setupConstants: deps?.constants,
        fileConstants: constants,
      });
      this.propsSchema = propsSchema;
      this.props = propsSchema
        ? createPropsProxy(this, propsSchemaKeys)
        : {};
      this._propsSchemaKeys = propsSchemaKeys;
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
      this._snabbdomH = h;
      this.cssText = yamlToCss(elementName, styles);
    }
  }

  return TuiComponent;
};
