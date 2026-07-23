import { parse } from "jempl";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

let defineOrUpdateComponent;
let defineOrUpdateComponents;
let restoreGlobals;
let windowTarget;

const registrySymbol = Symbol.for("@rettangoli/fe/hot-component-registry");

const createEventTarget = () => {
  const target = new EventTarget();
  const listenerCounts = new Map();
  const addEventListener = target.addEventListener.bind(target);
  const removeEventListener = target.removeEventListener.bind(target);
  target.addEventListener = (eventType, listener, options) => {
    listenerCounts.set(eventType, (listenerCounts.get(eventType) || 0) + 1);
    return addEventListener(eventType, listener, options);
  };
  target.removeEventListener = (eventType, listener, options) => {
    listenerCounts.set(
      eventType,
      Math.max(0, (listenerCounts.get(eventType) || 0) - 1),
    );
    return removeEventListener(eventType, listener, options);
  };
  target.listenerCount = (eventType) => listenerCounts.get(eventType) || 0;
  return target;
};

const linkSiblings = (children) => {
  children.forEach((child, index) => {
    child.previousSibling = children[index - 1] || null;
    child.nextSibling = children[index + 1] || null;
  });
};

const createFakeNode = (tagName = "div", nodeType = 1) => ({
  tagName,
  nodeType,
  __attrs: new Map(),
  children: [],
  childNodes: [],
  style: { cssText: "" },
  parentNode: null,
  previousSibling: null,
  nextSibling: null,
  setAttribute(name, value) {
    this.__attrs.set(name, String(value));
  },
  getAttribute(name) {
    return this.__attrs.has(name) ? this.__attrs.get(name) : null;
  },
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    this.childNodes = this.children;
    linkSiblings(this.children);
    return child;
  },
  insertBefore(child, referenceNode) {
    child.parentNode = this;
    const index = referenceNode ? this.children.indexOf(referenceNode) : -1;
    if (index < 0) this.children.push(child);
    else this.children.splice(index, 0, child);
    this.childNodes = this.children;
    linkSiblings(this.children);
    return child;
  },
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    this.childNodes = this.children;
    linkSiblings(this.children);
    return child;
  },
  get firstChild() {
    return this.children[0] || null;
  },
  get firstElementChild() {
    return this.children.find((child) => child.nodeType === 1) || null;
  },
  get lastChild() {
    return this.children[this.children.length - 1] || null;
  },
});

const installBrowserStubs = () => {
  const original = {
    CSSStyleSheet: globalThis.CSSStyleSheet,
    CustomEvent: globalThis.CustomEvent,
    HTMLElement: globalThis.HTMLElement,
    customElements: globalThis.customElements,
    document: globalThis.document,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    window: globalThis.window,
  };
  const definitions = new Map();

  class FakeHTMLElement {
    constructor() {
      this.__attrs = new Map();
      this.children = [];
      this.childNodes = this.children;
      this.style = {};
      this.isConnected = false;
      this.nodeType = 1;
    }

    setAttribute(name, value) {
      this.__attrs.set(name, String(value));
    }

    getAttribute(name) {
      return this.__attrs.has(name) ? this.__attrs.get(name) : null;
    }

    removeAttribute(name) {
      this.__attrs.delete(name);
    }

    dispatchEvent() {
      return true;
    }

    attachShadow() {
      if (this.shadowRoot) {
        throw new Error("Shadow root already exists");
      }
      this.shadowRoot = createFakeNode("shadow-root", 11);
      this.shadowRoot.adoptedStyleSheets = [];
      return this.shadowRoot;
    }
  }

  globalThis.HTMLElement = FakeHTMLElement;
  globalThis.CustomEvent = class {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
      this.bubbles = Boolean(init.bubbles);
    }
  };
  globalThis.CSSStyleSheet = class {
    replaceSync(text) {
      this.text = text;
    }
  };
  globalThis.customElements = {
    define(name, componentClass) {
      if (definitions.has(name)) {
        throw new Error(`Custom element '${name}' is already defined.`);
      }
      definitions.set(name, componentClass);
    },
    get: (name) => definitions.get(name),
  };
  globalThis.requestAnimationFrame = (callback) => callback();
  windowTarget = createEventTarget();
  const documentTarget = createEventTarget();
  documentTarget.createElement = (tagName) => createFakeNode(tagName);
  documentTarget.createElementNS = (_namespace, tagName) =>
    createFakeNode(tagName);
  documentTarget.createDocumentFragment = () =>
    createFakeNode("#document-fragment", 11);
  documentTarget.createTextNode = (text) => ({
    nodeType: 3,
    textContent: String(text),
    parentNode: null,
  });
  documentTarget.createComment = (text) => ({
    nodeType: 8,
    textContent: String(text),
    parentNode: null,
  });
  globalThis.window = windowTarget;
  globalThis.document = documentTarget;

  return () => {
    Object.assign(globalThis, original);
    delete globalThis[registrySymbol];
  };
};

const createConfig = ({
  componentName = "x-hot-counter",
  description = "counter v1",
  extraProp = null,
  handler = vi.fn(),
  incrementBy = 1,
  label = "one",
  methodValue = "method-v1",
  mountHandlers = {},
  styleColor = "red",
  templateText = "view-v1",
} = {}) => {
  const properties = { value: { description } };
  if (extraProp) properties[extraProp] = {};

  return {
    handlers: {
      handleWindowEvent: handler,
      ...mountHandlers,
    },
    methods: {
      readVersion() {
        return methodValue;
      },
    },
    constants: { label },
    schema: {
      componentName,
      description,
      propsSchema: {
        type: "object",
        properties,
      },
    },
    view: {
      template: parse([{ "div#root": templateText }]),
      refs: {
        window: {
          eventListeners: {
            hotregistryevent: {
              handler: "handleWindowEvent",
            },
          },
        },
      },
      styles: {
        ":host": {
          color: styleColor,
        },
      },
    },
    store: {
      createInitialState: () => ({ count: 0 }),
      selectViewData: ({ state, constants }) => ({
        count: state.count,
        label: constants.label,
      }),
      increment: ({ state }) => {
        state.count += incrementBy;
      },
    },
  };
};

const connect = (instance) => {
  instance.render = vi.fn();
  instance.isConnected = true;
  instance.connectedCallback();
  return instance;
};

describe("hot component registry", () => {
  beforeAll(async () => {
    restoreGlobals = installBrowserStubs();
    ({
      defineOrUpdateComponent,
      defineOrUpdateComponents,
    } = await import("../../src/web/hotComponentRegistry.js"));
  });

  beforeEach(() => {
    delete globalThis[registrySymbol];
  });

  afterAll(() => {
    restoreGlobals?.();
  });

  it("updates live and future instances while retaining state and stable facades", () => {
    const oldHandler = vi.fn();
    const initialConfig = createConfig({ handler: oldHandler });
    const firstResult = defineOrUpdateComponent({
      componentConfig: initialConfig,
      componentId: "components/hotCounterLive",
      deps: {},
      fingerprint: "v1",
    });
    const ComponentClass = firstResult.componentClass;
    const instance = connect(new ComponentClass());
    const store = instance.store;
    const increment = store.increment;
    const readVersion = instance.readVersion;

    increment();
    windowTarget.dispatchEvent(new Event("hotregistryevent"));
    expect(store.getState().count).toBe(1);
    expect(oldHandler).toHaveBeenCalledTimes(1);
    expect(windowTarget.listenerCount("hotregistryevent")).toBe(1);

    const newHandler = vi.fn();
    const nextConfig = createConfig({
      description: "counter v2",
      handler: newHandler,
      incrementBy: 10,
      label: "ten",
      methodValue: "method-v2",
      styleColor: "blue",
      templateText: "view-v2",
    });
    const updateResult = defineOrUpdateComponent({
      componentConfig: nextConfig,
      componentId: "components/hotCounterLive",
      deps: {},
      fingerprint: "v2",
    });

    expect(updateResult).toMatchObject({
      status: "updated",
      updatedInstances: 1,
    });
    expect(updateResult.componentClass).toBe(ComponentClass);
    expect(instance.store).toBe(store);
    expect(instance.store.increment).toBe(increment);
    expect(instance.readVersion).toBe(readVersion);
    expect(instance.propsSchema).toBe(nextConfig.schema.propsSchema);
    expect(instance.template).toBe(nextConfig.view.template);
    expect(instance.constants.label).toBe("ten");
    expect(instance.cssText).toContain("color: blue");
    expect(instance.shadow.adoptedStyleSheets[1].text).toContain("color: blue");
    expect(store.selectViewData().label).toBe("ten");
    expect(readVersion()).toBe("method-v2");

    increment();
    windowTarget.dispatchEvent(new Event("hotregistryevent"));
    expect(store.getState().count).toBe(11);
    expect(oldHandler).toHaveBeenCalledTimes(1);
    expect(newHandler).toHaveBeenCalledTimes(1);
    expect(windowTarget.listenerCount("hotregistryevent")).toBe(1);

    const futureInstance = connect(new ComponentClass());
    expect(futureInstance.constants.label).toBe("ten");
    expect(futureInstance.readVersion()).toBe("method-v2");
    futureInstance.store.increment();
    expect(futureInstance.store.getState().count).toBe(10);

    instance.isConnected = false;
    instance.disconnectedCallback();
    const latestConfig = createConfig({
      handler: vi.fn(),
      incrementBy: 100,
      label: "hundred",
      methodValue: "method-v3",
      styleColor: "green",
      templateText: "view-v3",
    });
    const latestResult = defineOrUpdateComponent({
      componentConfig: latestConfig,
      componentId: "components/hotCounterLive",
      deps: {},
      fingerprint: "v3",
    });
    expect(latestResult.updatedInstances).toBe(1);

    // A disconnected instance is not retained by the registry and catches up
    // only if the application reconnects it.
    increment();
    expect(store.getState().count).toBe(21);
    instance.isConnected = true;
    instance.connectedCallback();
    expect(instance.store).toBe(store);
    expect(instance.readVersion).toBe(readVersion);
    expect(readVersion()).toBe("method-v3");
    increment();
    expect(store.getState().count).toBe(121);
  });

  it("does not rerender an unchanged fingerprint unless a JS module changed", () => {
    const config = createConfig({ componentName: "x-hot-unchanged" });
    const initial = defineOrUpdateComponent({
      componentConfig: config,
      componentId: "components/hotUnchanged",
      deps: {},
      fingerprint: "same",
    });
    const instance = connect(new initial.componentClass());
    instance.render.mockClear();

    const regeneratedYamlConfig = {
      ...config,
      constants: { ...config.constants },
      schema: structuredClone(config.schema),
      view: {
        ...config.view,
        refs: structuredClone(config.view.refs),
        styles: structuredClone(config.view.styles),
      },
    };
    const unchanged = defineOrUpdateComponent({
      componentConfig: regeneratedYamlConfig,
      componentId: "components/hotUnchanged",
      deps: {},
      fingerprint: "same",
    });
    expect(unchanged.status).toBe("unchanged");
    expect(instance.render).not.toHaveBeenCalled();

    const changedStoreConfig = {
      ...regeneratedYamlConfig,
      store: {
        ...config.store,
        increment: ({ state }) => {
          state.count += 7;
        },
      },
    };
    const transitiveUpdate = defineOrUpdateComponent({
      componentConfig: changedStoreConfig,
      componentId: "components/hotUnchanged",
      deps: {},
      fingerprint: "same",
    });
    expect(transitiveUpdate.status).toBe("updated");
    expect(instance.render).toHaveBeenCalledTimes(1);
    instance.store.increment();
    expect(instance.store.getState().count).toBe(7);
  });

  it("applies changed setup dependency values with an unchanged component fingerprint", () => {
    const config = createConfig({ componentName: "x-hot-dependency" });
    const initial = defineOrUpdateComponent({
      componentConfig: config,
      componentId: "components/hotDependency",
      deps: { serviceVersion: "v1" },
      fingerprint: "same-component-source",
    });
    const instance = connect(new initial.componentClass());
    const store = instance.store;
    instance.render.mockClear();

    const result = defineOrUpdateComponent({
      componentConfig: config,
      componentId: "components/hotDependency",
      deps: { serviceVersion: "v2" },
      fingerprint: "same-component-source",
    });

    expect(result.status).toBe("updated");
    expect(instance.store).toBe(store);
    expect(instance.deps.serviceVersion).toBe("v2");
    expect(instance._runtimeDeps.serviceVersion).toBe("v2");
    expect(instance.render).toHaveBeenCalledTimes(1);
  });

  it("reloads instead of leaving mount side effects wired to an old dependency", () => {
    const handleBeforeMount = vi.fn(() => vi.fn());
    const config = createConfig({
      componentName: "x-hot-mount-dependency",
      mountHandlers: { handleBeforeMount },
    });
    const firstBus = { name: "first" };
    const initial = defineOrUpdateComponent({
      componentConfig: config,
      componentId: "components/hotMountDependency",
      deps: { bus: firstBus },
      fingerprint: "same-component-source",
    });
    const instance = connect(new initial.componentClass());

    const result = defineOrUpdateComponent({
      componentConfig: config,
      componentId: "components/hotMountDependency",
      deps: { bus: { name: "second" } },
      fingerprint: "same-component-source",
    });

    expect(result).toMatchObject({
      status: "incompatible",
      reason: "mount-dependencies-changed",
    });
    expect(instance.deps.bus).toBe(firstBus);
    expect(handleBeforeMount).toHaveBeenCalledTimes(1);
  });

  it("rejects view and constants updates while a mount hook is live", () => {
    let heldDeps;
    const handleBeforeMount = (deps) => {
      heldDeps = deps;
    };
    const config = createConfig({
      componentName: "x-hot-runtime-deps",
      mountHandlers: { handleBeforeMount },
    });
    const initial = defineOrUpdateComponent({
      componentConfig: config,
      componentId: "components/hotRuntimeDeps",
      deps: { serviceVersion: "v1" },
      fingerprint: "v1",
    });
    const instance = connect(new initial.componentClass());
    const depsIdentity = heldDeps;
    const storeIdentity = heldDeps.store;
    const originalConstants = instance.constants;
    const originalTemplate = instance.template;
    instance.render.mockClear();

    const unchanged = defineOrUpdateComponent({
      componentConfig: config,
      componentId: "components/hotRuntimeDeps",
      deps: { serviceVersion: "v1" },
      fingerprint: "v1",
    });
    expect(unchanged.status).toBe("unchanged");

    const nextHandler = vi.fn();
    const nextConfig = createConfig({
      componentName: "x-hot-runtime-deps",
      handler: nextHandler,
      label: "updated",
      mountHandlers: { handleBeforeMount },
      templateText: "updated-view",
    });

    const result = defineOrUpdateComponent({
      componentConfig: nextConfig,
      componentId: "components/hotRuntimeDeps",
      deps: { serviceVersion: "v1" },
      fingerprint: "v2",
    });

    expect(result).toMatchObject({
      status: "incompatible",
      reason: "live-mount-lifecycle-requires-reload",
    });
    expect(heldDeps).toBe(depsIdentity);
    expect(heldDeps.store).toBe(storeIdentity);
    expect(heldDeps.constants.label).toBe("one");
    expect(heldDeps.handlers).toBe(config.handlers);
    expect(heldDeps.serviceVersion).toBe("v1");
    expect(instance.constants).toBe(originalConstants);
    expect(instance.template).toBe(originalTemplate);
    expect(instance.store).toBe(storeIdentity);
    expect(instance.render).not.toHaveBeenCalled();

    const stillUnchanged = defineOrUpdateComponent({
      componentConfig: config,
      componentId: "components/hotRuntimeDeps",
      deps: { serviceVersion: "v1" },
      fingerprint: "v1",
    });
    expect(stillUnchanged.status).toBe("unchanged");
  });

  it("updates mount-hook records with no live instances and applies on reconnect", () => {
    const oldBeforeMount = vi.fn();
    const config = createConfig({
      componentName: "x-hot-disconnected-mount",
      mountHandlers: { handleBeforeMount: oldBeforeMount },
    });
    const initial = defineOrUpdateComponent({
      componentConfig: config,
      componentId: "components/hotDisconnectedMount",
      deps: {},
      fingerprint: "v1",
    });
    const instance = connect(new initial.componentClass());
    const originalTemplate = instance.template;
    expect(oldBeforeMount).toHaveBeenCalledTimes(1);

    instance.isConnected = false;
    instance.disconnectedCallback();
    const newBeforeMount = vi.fn();
    const nextConfig = createConfig({
      componentName: "x-hot-disconnected-mount",
      label: "updated-while-disconnected",
      mountHandlers: { handleBeforeMount: newBeforeMount },
      templateText: "updated-while-disconnected",
    });
    const result = defineOrUpdateComponent({
      componentConfig: nextConfig,
      componentId: "components/hotDisconnectedMount",
      deps: {},
      fingerprint: "v2",
    });

    expect(result).toMatchObject({ status: "updated", updatedInstances: 0 });
    expect(instance.template).toBe(originalTemplate);
    instance.isConnected = true;
    instance.connectedCallback();
    expect(oldBeforeMount).toHaveBeenCalledTimes(1);
    expect(newBeforeMount).toHaveBeenCalledTimes(1);
    expect(instance.template).toBe(nextConfig.view.template);
    expect(instance.constants.label).toBe("updated-while-disconnected");
  });

  it("reports schema topology and mount lifecycle changes atomically", () => {
    const config = createConfig({ componentName: "x-hot-incompatible" });
    const initial = defineOrUpdateComponent({
      componentConfig: config,
      componentId: "components/hotIncompatible",
      deps: {},
      fingerprint: "v1",
    });
    const instance = connect(new initial.componentClass());
    const originalSchema = instance.propsSchema;

    const propsResult = defineOrUpdateComponent({
      componentConfig: createConfig({
        componentName: "x-hot-incompatible",
        extraProp: "addedProp",
        incrementBy: 50,
      }),
      componentId: "components/hotIncompatible",
      deps: {},
      fingerprint: "bad-props",
    });
    expect(propsResult).toMatchObject({
      status: "incompatible",
      reason: "props-schema-keys-changed",
    });
    expect(instance.propsSchema).toBe(originalSchema);
    instance.store.increment();
    expect(instance.store.getState().count).toBe(1);

    const renameResult = defineOrUpdateComponent({
      componentConfig: createConfig({ componentName: "x-hot-renamed" }),
      componentId: "components/hotIncompatible",
      deps: {},
      fingerprint: "bad-name",
    });
    expect(renameResult).toMatchObject({
      status: "incompatible",
      reason: "component-name-changed",
    });
    expect(globalThis.customElements.get("x-hot-renamed")).toBeUndefined();

    const lifecycleResult = defineOrUpdateComponent({
      componentConfig: createConfig({
        componentName: "x-hot-incompatible",
        mountHandlers: { handleBeforeMount: vi.fn() },
      }),
      componentId: "components/hotIncompatible",
      deps: {},
      fingerprint: "bad-lifecycle",
    });
    expect(lifecycleResult).toMatchObject({
      status: "incompatible",
      reason: "mount-lifecycle-changed",
    });
    expect(lifecycleResult.message).toContain("arbitrary side effects");
  });

  it("preflights every instance before committing an update", () => {
    const config = createConfig({ componentName: "x-hot-atomic" });
    const initial = defineOrUpdateComponent({
      componentConfig: config,
      componentId: "components/hotAtomic",
      deps: {},
      fingerprint: "v1",
    });
    const firstInstance = connect(new initial.componentClass());
    const secondInstance = connect(new initial.componentClass());
    secondInstance.conflictingMethod = "user-owned";
    const originalTemplate = firstInstance.template;
    const invalidConfig = createConfig({
      componentName: "x-hot-atomic",
      incrementBy: 50,
      templateText: "must-not-commit",
    });
    invalidConfig.methods = {
      ...invalidConfig.methods,
      conflictingMethod() {
        return "framework-owned";
      },
    };

    expect(() =>
      defineOrUpdateComponent({
        componentConfig: invalidConfig,
        componentId: "components/hotAtomic",
        deps: {},
        fingerprint: "invalid",
      }),
    ).toThrow("already exists on the component instance");

    expect(firstInstance.template).toBe(originalTemplate);
    expect(firstInstance.conflictingMethod).toBeUndefined();
    expect(secondInstance.conflictingMethod).toBe("user-owned");
    firstInstance.store.increment();
    expect(firstInstance.store.getState().count).toBe(1);

    const unchanged = defineOrUpdateComponent({
      componentConfig: config,
      componentId: "components/hotAtomic",
      deps: {},
      fingerprint: "v1",
    });
    expect(unchanged.status).toBe("unchanged");
  });

  it("preflights every component before committing a batch", () => {
    const configA = createConfig({ componentName: "x-hot-batch-a" });
    const configB = createConfig({ componentName: "x-hot-batch-b" });
    const initialA = defineOrUpdateComponent({
      componentConfig: configA,
      componentId: "components/hotBatchA",
      deps: {},
      fingerprint: "a-v1",
    });
    const initialB = defineOrUpdateComponent({
      componentConfig: configB,
      componentId: "components/hotBatchB",
      deps: {},
      fingerprint: "b-v1",
    });
    const instanceA = connect(new initialA.componentClass());
    const instanceB = connect(new initialB.componentClass());
    const templateA = instanceA.template;
    const templateB = instanceB.template;
    const constantsA = instanceA.constants;
    const storeA = instanceA.store;
    const storeB = instanceB.store;
    instanceA.render.mockClear();
    instanceB.render.mockClear();
    instanceB.conflictingMethod = "user-owned";

    const nextA = createConfig({
      componentName: "x-hot-batch-a",
      incrementBy: 10,
      label: "a-v2",
      templateText: "a-v2",
    });
    const nextB = createConfig({
      componentName: "x-hot-batch-b",
      incrementBy: 20,
      templateText: "b-must-not-commit",
    });
    nextB.methods = {
      ...nextB.methods,
      conflictingMethod() {
        return "framework-owned";
      },
    };
    const newConfig = createConfig({
      componentName: "x-hot-batch-new",
    });

    expect(() =>
      defineOrUpdateComponents({
        components: [
          {
            componentConfig: nextA,
            componentId: "components/hotBatchA",
            deps: {},
            fingerprint: "a-v2",
          },
          {
            componentConfig: newConfig,
            componentId: "components/hotBatchNew",
            deps: {},
            fingerprint: "new-v1",
          },
          {
            componentConfig: nextB,
            componentId: "components/hotBatchB",
            deps: {},
            fingerprint: "b-v2",
          },
        ],
      }),
    ).toThrow("already exists on the component instance");

    expect(globalThis.customElements.get("x-hot-batch-new")).toBeUndefined();
    expect(instanceA.template).toBe(templateA);
    expect(instanceA.constants).toBe(constantsA);
    expect(instanceA.store).toBe(storeA);
    expect(instanceB.template).toBe(templateB);
    expect(instanceB.store).toBe(storeB);
    expect(instanceB.conflictingMethod).toBe("user-owned");
    expect(instanceA.render).not.toHaveBeenCalled();
    expect(instanceB.render).not.toHaveBeenCalled();
    instanceA.store.increment();
    instanceB.store.increment();
    expect(instanceA.store.getState().count).toBe(1);
    expect(instanceB.store.getState().count).toBe(1);

    expect(
      defineOrUpdateComponent({
        componentConfig: configA,
        componentId: "components/hotBatchA",
        deps: {},
        fingerprint: "a-v1",
      }).status,
    ).toBe("unchanged");
    expect(
      defineOrUpdateComponent({
        componentConfig: configB,
        componentId: "components/hotBatchB",
        deps: {},
        fingerprint: "b-v1",
      }).status,
    ).toBe("unchanged");
  });

  it("publishes every child record before an updated parent can create it", () => {
    const initialParentConfig = createConfig({
      componentName: "x-hot-batch-parent",
      templateText: "parent-v1",
    });
    const initialChildConfig = createConfig({
      componentName: "x-hot-batch-child",
      incrementBy: 1,
      label: "child-v1",
      methodValue: "child-method-v1",
      templateText: "child-v1",
    });
    const initialParent = defineOrUpdateComponent({
      componentConfig: initialParentConfig,
      componentId: "components/hotBatchParent",
      deps: {},
      fingerprint: "parent-v1",
    });
    const initialChild = defineOrUpdateComponent({
      componentConfig: initialChildConfig,
      componentId: "components/hotBatchChild",
      deps: {},
      fingerprint: "child-v1",
    });
    const parentInstance = connect(new initialParent.componentClass());
    let childCreatedDuringParentUpdate;
    parentInstance.render.mockClear();
    parentInstance.render.mockImplementation(() => {
      childCreatedDuringParentUpdate = connect(
        new initialChild.componentClass(),
      );
    });

    const nextParentConfig = createConfig({
      componentName: "x-hot-batch-parent",
      templateText: "parent-v2",
    });
    const nextChildConfig = createConfig({
      componentName: "x-hot-batch-child",
      incrementBy: 10,
      label: "child-v2",
      methodValue: "child-method-v2",
      templateText: "child-v2",
    });
    const result = defineOrUpdateComponents({
      components: [
        {
          componentConfig: nextParentConfig,
          componentId: "components/hotBatchParent",
          deps: {},
          fingerprint: "parent-v2",
        },
        {
          componentConfig: nextChildConfig,
          componentId: "components/hotBatchChild",
          deps: {},
          fingerprint: "child-v2",
        },
      ],
    });

    expect(result.status).toBe("committed");
    expect(parentInstance.render).toHaveBeenCalledTimes(1);
    expect(childCreatedDuringParentUpdate).toBeDefined();
    expect(childCreatedDuringParentUpdate.template).toBe(
      nextChildConfig.view.template,
    );
    expect(childCreatedDuringParentUpdate.constants.label).toBe("child-v2");
    expect(childCreatedDuringParentUpdate.readVersion()).toBe(
      "child-method-v2",
    );
    childCreatedDuringParentUpdate.store.increment();
    expect(
      childCreatedDuringParentUpdate.store.getState().count,
    ).toBe(10);
    expect(result.results[1]).toMatchObject({
      status: "updated",
      updatedInstances: 0,
    });
  });
});
