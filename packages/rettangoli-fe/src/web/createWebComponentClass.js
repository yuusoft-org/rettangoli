import { parseAndRender } from "jempl";
import { bindMethods } from "../core/runtime/methods.js";
import { bindStore } from "../core/runtime/store.js";
import { resolveConstants } from "../core/runtime/constants.js";
import { yamlToCss } from "../core/style/yamlToCss.js";
import {
  runAttributeChangedComponentLifecycle,
  runConnectedComponentLifecycle,
  runDisconnectedComponentLifecycle,
  runPropChangedComponentLifecycle,
  runRenderComponentLifecycle,
} from "../core/runtime/componentOrchestrator.js";
import { createPropsProxy, installReactiveProps, toKebabCase } from "../core/runtime/props.js";
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
    i18nRuntime;
    _i18nUnsubscribe;
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
      return {
        ...data,
        i18n: this.i18nRuntime?.getMessages?.() || {},
      };
    }

    connectedCallback() {
      const dom = initializeComponentDom({
        host: this,
        cssText: this.cssText,
      });
      this.shadow = dom.shadow;
      this.renderTarget = dom.renderTarget;
      if (this.i18nRuntime?.subscribe && !this._i18nUnsubscribe) {
        this._i18nUnsubscribe = this.i18nRuntime.subscribe(() => {
          this.render();
        });
      }
      runConnectedComponentLifecycle({
        instance: this,
        parseAndRenderFn: parseAndRender,
        renderFn: this.render,
      });
    }

    disconnectedCallback() {
      if (this._i18nUnsubscribe) {
        this._i18nUnsubscribe();
        this._i18nUnsubscribe = undefined;
      }
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
      installReactiveProps({
        source: this,
        allowedKeys: propsSchemaKeys,
        onPropChange: ({ propName, oldValue, newValue }) => {
          runPropChangedComponentLifecycle({
            instance: this,
            propName,
            oldValue,
            newValue,
            scheduleFrameFn: scheduleFrame,
          });
        },
      });
      this.props = propsSchema
        ? createPropsProxy(this, propsSchemaKeys)
        : {};
      this._propsSchemaKeys = propsSchemaKeys;
      this.elementName = elementName;
      this.styles = styles;
      this.i18nRuntime = deps?.__rtglI18nRuntime;
      this.store = bindStore(store, this.props, this.constants, {
        getI18n: () => this.i18nRuntime?.getMessages?.() || {},
        locale: this.i18nRuntime?.locale,
      });
      this.template = template;
      this.handlers = handlers;
      this.methods = methods;
      this.refs = refs;
      this.patch = patch;
      this.deps = {
        ...deps,
        locale: this.i18nRuntime?.locale || deps?.locale,
        store: this.store,
        render: this.render,
        handlers,
        props: this.props,
        constants: this.constants,
      };
      if (this.i18nRuntime) {
        Object.defineProperty(this.deps, "i18n", {
          enumerable: true,
          configurable: true,
          get: () => this.i18nRuntime.getMessages(),
        });
      }
      bindMethods(this, this.methods);
      // Keep the Snabbdom helper off public prop names (e.g. schema prop "h").
      this._snabbdomH = h;
      this.cssText = yamlToCss(elementName, styles);
    }
  }

  return MyComponent;
};
