import { parseAndRender } from "jempl";
import {
  bindMethods,
  commitHotUpdateBoundMethods,
  prepareHotUpdateBoundMethods,
} from "../core/runtime/methods.js";
import {
  bindStore,
  hotUpdateBoundStore,
  prepareHotUpdateBoundStore,
} from "../core/runtime/store.js";
import { resolveConstants } from "../core/runtime/constants.js";
import { yamlToCss } from "../core/style/yamlToCss.js";
import { validateEventConfig } from "../core/view/refs.js";
import {
  runAttributeChangedComponentLifecycle,
  runConnectedComponentLifecycle,
  runDisconnectedComponentLifecycle,
  runHotUpdatedComponentLifecycle,
  runPropChangedComponentLifecycle,
  runRenderComponentLifecycle,
} from "../core/runtime/componentOrchestrator.js";
import { createPropsProxy, installReactiveProps, toKebabCase } from "../core/runtime/props.js";
import {
  buildObservedAttributes,
} from "../core/runtime/componentRuntime.js";
import { initializeComponentDom } from "./componentDom.js";
import {
  createWebComponentUpdateHook,
  RETTANGOLI_COMPONENT_MARKER,
} from "./componentUpdateHook.js";
import { scheduleFrame } from "./scheduler.js";

export const RETTANGOLI_HOT_APPLY = Symbol.for(
  "@rettangoli/fe/hot-apply",
);
export const RETTANGOLI_HOT_PREPARE = Symbol.for(
  "@rettangoli/fe/hot-prepare",
);

const syncObject = (target, source) => {
  Reflect.ownKeys(target).forEach((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor?.configurable) {
      delete target[key];
    }
  });
  Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
  return target;
};

const syncInstanceDeps = ({ instance, sourceDeps, handlers }) => {
  const nextDeps = {
    ...sourceDeps,
    locale: instance.i18nRuntime?.locale || sourceDeps?.locale,
    store: instance.store,
    render: instance.render,
    handlers,
    props: instance.props,
    constants: instance.constants,
  };

  if (instance.i18nRuntime) {
    Object.defineProperty(nextDeps, "i18n", {
      enumerable: true,
      configurable: true,
      get: () => instance.i18nRuntime.getMessages(),
    });
  }

  if (!instance.deps) {
    instance.deps = {};
  }
  syncObject(instance.deps, nextDeps);
};

const createStoreRuntimeContext = (instance) => ({
  getI18n: () => instance.i18nRuntime?.getMessages?.() || {},
  locale: instance.i18nRuntime?.locale,
});

const validateHotRefs = (refs = {}) => {
  Object.entries(refs || {}).forEach(([refKey, refConfig]) => {
    Object.entries(refConfig?.eventListeners || {}).forEach(
      ([eventType, eventConfig]) => {
        validateEventConfig({ eventType, eventConfig, refKey });
      },
    );
  });
};

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
  hotRecord = null,
}) => {
  const initialDefinition = {
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
  };

  class BaseComponent extends HTMLElement {
    [RETTANGOLI_COMPONENT_MARKER] = true;
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
    _runtimeDeps;
    deps;
    i18nRuntime;
    _i18nUnsubscribe;
    _propsSchemaKeys = [];
    cssText;
    _hotRecord;
    _hotRevision = 0;

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
      if (this._hotRecord) {
        const record = this._hotRecord;
        if (this._hotRevision !== record.revision) {
          this[RETTANGOLI_HOT_APPLY]({
            definition: record.definition,
            deps: record.deps,
            revision: record.revision,
            refresh: false,
          });
        }
        record.instances.add(this);
      }

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
      this._hotRecord?.instances.delete(this);
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

    [RETTANGOLI_HOT_APPLY]({
      definition,
      deps: nextDeps,
      revision,
      refresh = true,
      preparedUpdate,
    }) {
      if (this._hotRevision === revision) {
        return;
      }

      const update = preparedUpdate || this[RETTANGOLI_HOT_PREPARE]({
        definition,
        deps: nextDeps,
        revision,
      });

      this.i18nRuntime = update.i18nRuntime;
      this.constants = update.constants;
      this.propsSchema = definition.propsSchema;
      this.styles = definition.styles;
      this.template = definition.template;
      this.handlers = definition.handlers;
      this.methods = definition.methods;
      this.refs = definition.refs;
      this.cssText = update.cssText;

      hotUpdateBoundStore(update.storeUpdate);
      commitHotUpdateBoundMethods(update.methodsUpdate);
      syncInstanceDeps({
        instance: this,
        sourceDeps: nextDeps,
        handlers: this.handlers,
      });
      this._hotRevision = revision;

      if (!refresh || !this.renderTarget) {
        return;
      }

      const dom = initializeComponentDom({
        host: this,
        cssText: this.cssText,
      });
      this.shadow = dom.shadow;
      this.renderTarget = dom.renderTarget;
      runHotUpdatedComponentLifecycle({
        instance: this,
        parseAndRenderFn: parseAndRender,
      });
    }

    [RETTANGOLI_HOT_PREPARE]({ definition, deps: nextDeps, revision }) {
      const methodsUpdate = prepareHotUpdateBoundMethods(
        this,
        definition.methods,
      );
      validateHotRefs(definition.refs);

      const i18nRuntime = this.i18nRuntime || nextDeps?.__rtglI18nRuntime;
      const nextConstants = resolveConstants({
        setupConstants: nextDeps?.constants,
        fileConstants: definition.constants,
      });
      const runtimeContext = {
        getI18n: () => i18nRuntime?.getMessages?.() || {},
        locale: i18nRuntime?.locale,
      };
      const storeUpdate = prepareHotUpdateBoundStore({
        boundStore: this.store,
        store: definition.store,
        props: this.props,
        constants: nextConstants,
        runtimeContext,
      });

      return {
        constants: nextConstants,
        cssText: yamlToCss(this.elementName, definition.styles),
        definition,
        i18nRuntime,
        methodsUpdate,
        revision,
        storeUpdate,
      };
    }
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
      const currentDefinition = hotRecord?.definition || initialDefinition;
      const currentDeps = hotRecord?.deps || deps;
      this._hotRecord = hotRecord;
      this._hotRevision = hotRecord?.revision || 0;
      this.constants = resolveConstants({
        setupConstants: currentDeps?.constants,
        fileConstants: currentDefinition.constants,
      });
      this.propsSchema = currentDefinition.propsSchema;
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
      this.styles = currentDefinition.styles;
      this.i18nRuntime = currentDeps?.__rtglI18nRuntime;
      this.store = bindStore(
        currentDefinition.store,
        this.props,
        this.constants,
        createStoreRuntimeContext(this),
      );
      this.template = currentDefinition.template;
      this.handlers = currentDefinition.handlers;
      this.methods = currentDefinition.methods;
      this.refs = currentDefinition.refs;
      this.patch = patch;
      syncInstanceDeps({
        instance: this,
        sourceDeps: currentDeps,
        handlers: this.handlers,
      });
      bindMethods(this, this.methods);
      // Keep the Snabbdom helper off public prop names (e.g. schema prop "h").
      this._snabbdomH = h;
      this.cssText = yamlToCss(elementName, currentDefinition.styles);
    }
  }

  return MyComponent;
};
