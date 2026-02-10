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
import { createPropsProxy, toKebabCase } from "../core/runtime/props.js";
import {
  buildObservedAttributes,
} from "../core/runtime/componentRuntime.js";
import { initializeComponentDom } from "./componentDom.js";
import { createWebComponentUpdateHook } from "./componentUpdateHook.js";
import { scheduleFrame } from "./scheduler.js";

export const createWebComponentClass = ({
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
  class BaseComponent extends HTMLElement {
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
      const dom = initializeComponentDom({
        host: this,
        cssText: this.cssText,
      });
      this.shadow = dom.shadow;
      this.renderTarget = dom.renderTarget;
      runConnectedComponentLifecycle({
        instance: this,
        parseAndRenderFn: parseAndRender,
        renderFn: this.render,
      });
    }

    disconnectedCallback() {
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

    render = () => {
      runRenderComponentLifecycle({
        instance: this,
        createComponentUpdateHookFn: createWebComponentUpdateHook,
      });
    };
  }

  class MyComponent extends BaseComponent {
    static get observedAttributes() {
      return buildObservedAttributes({
        propsSchemaKeys,
        toKebabCase,
      });
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
      // Keep the Snabbdom helper off public prop names (e.g. schema prop "h").
      this._snabbdomH = h;
      this.cssText = yamlToCss(elementName, styles);
    }
  }

  return MyComponent;
};
