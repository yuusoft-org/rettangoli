import createComponent, {
  resolveComponentDefinition,
} from "../createComponent.js";
import {
  RETTANGOLI_HOT_APPLY,
  RETTANGOLI_HOT_PREPARE,
} from "./createWebComponentClass.js";

const RETTANGOLI_HOT_COMPONENT_REGISTRY = Symbol.for(
  "@rettangoli/fe/hot-component-registry",
);

const getRegistry = () => {
  if (!globalThis[RETTANGOLI_HOT_COMPONENT_REGISTRY]) {
    Object.defineProperty(globalThis, RETTANGOLI_HOT_COMPONENT_REGISTRY, {
      configurable: true,
      enumerable: false,
      writable: false,
      value: {
        records: new Map(),
      },
    });
  }
  return globalThis[RETTANGOLI_HOT_COMPONENT_REGISTRY];
};

const sortedPropKeys = (definition) =>
  [...definition.propsSchemaKeys].sort((a, b) => a.localeCompare(b));

const haveEqualItems = (left, right) =>
  left.length === right.length && left.every((item, index) => item === right[index]);

const getIncompatibilityReason = ({ record, definition, deps }) => {
  if (record.definition.elementName !== definition.elementName) {
    return "component-name-changed";
  }

  if (
    !haveEqualItems(
      sortedPropKeys(record.definition),
      sortedPropKeys(definition),
    )
  ) {
    return "props-schema-keys-changed";
  }

  const hadI18nRuntime = Boolean(record.deps?.__rtglI18nRuntime);
  const hasI18nRuntime = Boolean(deps?.__rtglI18nRuntime);
  if (hadI18nRuntime !== hasI18nRuntime) {
    return "i18n-runtime-changed";
  }

  return null;
};

const mountLifecycleChanged = (previousDefinition, nextDefinition) => {
  return ["handleBeforeMount", "handleAfterMount"].some(
    (lifecycleName) =>
      previousDefinition.handlers?.[lifecycleName] !==
      nextDefinition.handlers?.[lifecycleName],
  );
};

const hasMountLifecycle = (definition) => {
  return ["handleBeforeMount", "handleAfterMount"].some(
    (lifecycleName) =>
      typeof definition.handlers?.[lifecycleName] === "function",
  );
};

const retainFrameworkRuntimeDeps = ({ previousDeps, nextDeps }) => {
  const previousI18nRuntime = previousDeps?.__rtglI18nRuntime;
  if (!previousI18nRuntime || !nextDeps?.__rtglI18nRuntime) {
    return nextDeps;
  }

  return {
    ...nextDeps,
    __rtglI18nRuntime: previousI18nRuntime,
    locale: previousI18nRuntime.locale,
  };
};

const haveSameModuleReferences = (previousDefinition, nextDefinition) => {
  return ["handlers", "methods", "store"].every(
    (fileType) =>
      previousDefinition[fileType] === nextDefinition[fileType],
  );
};

const haveSameDependencyValues = (previousDeps = {}, nextDeps = {}) => {
  const previousKeys = Reflect.ownKeys(previousDeps || {});
  const nextKeys = Reflect.ownKeys(nextDeps || {});
  return (
    previousKeys.length === nextKeys.length &&
    previousKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(nextDeps || {}, key) &&
        Object.is(previousDeps[key], nextDeps[key]),
    )
  );
};

const INCOMPATIBILITY_MESSAGES = {
  "component-name-changed":
    "schema.componentName changed; the browser cannot redefine an existing custom element.",
  "props-schema-keys-changed":
    "schema.propsSchema keys changed; observed attributes are fixed when the custom element is defined.",
  "i18n-runtime-changed":
    "the component's i18n runtime availability changed and requires a page reload.",
  "mount-lifecycle-changed":
    "handleBeforeMount or handleAfterMount changed. Mount hooks can own arbitrary side effects, so this update requires a page reload.",
  "mount-dependencies-changed":
    "a dependency used by a mount hook changed. The old hook must be cleaned up and mounted again, so this update requires a page reload.",
  "live-mount-lifecycle-requires-reload":
    "a live component uses handleBeforeMount or handleAfterMount. Mount hooks can own arbitrary side effects, so changing this component requires a page reload.",
  "component-already-defined-outside-hmr":
    "the custom element was already defined outside Rettangoli's hot-update registry.",
  "component-registry-mismatch":
    "the browser's registered custom-element class no longer matches Rettangoli's hot-update registry.",
};

const incompatibleResult = ({ elementName, reason }) => ({
  status: "incompatible",
  elementName,
  reason,
  message: INCOMPATIBILITY_MESSAGES[reason] || "the component requires a page reload.",
});

const RESERVED_CUSTOM_ELEMENT_NAMES = new Set([
  "annotation-xml",
  "color-profile",
  "font-face",
  "font-face-src",
  "font-face-uri",
  "font-face-format",
  "font-face-name",
  "missing-glyph",
]);

const assertValidCustomElementName = (elementName) => {
  const isValid =
    typeof elementName === "string" &&
    /^[a-z][.0-9_a-z-]*-[.0-9_a-z-]*$/.test(elementName) &&
    !elementName.startsWith("xml") &&
    !RESERVED_CUSTOM_ELEMENT_NAMES.has(elementName);
  if (!isValid) {
    throw new Error(
      `[HMR] Invalid custom-element name '${elementName}'. Use a lowercase name containing a hyphen.`,
    );
  }
};

const prepareInstanceUpdate = ({
  definition,
  elementName,
  instance,
  nextRevision,
  retainedDeps,
}) => {
  const prepareUpdate = instance?.[RETTANGOLI_HOT_PREPARE];
  const applyUpdate = instance?.[RETTANGOLI_HOT_APPLY];
  if (
    typeof prepareUpdate !== "function" ||
    typeof applyUpdate !== "function"
  ) {
    throw new Error(
      `[HMR] Existing '${elementName}' instance cannot accept hot updates.`,
    );
  }

  return {
    applyUpdate,
    instance,
    preparedUpdate: prepareUpdate.call(instance, {
      definition,
      deps: retainedDeps,
      revision: nextRevision,
    }),
  };
};

const prepareComponentUpdate = ({
  registration,
  registry,
  customElementRegistry,
  recordKeys,
  elementNames,
}) => {
  const {
    componentConfig,
    componentId,
    deps,
    fingerprint,
  } = registration || {};
  const definition = resolveComponentDefinition(componentConfig || {});
  const { elementName } = definition;
  assertValidCustomElementName(elementName);
  const recordKey = componentId || elementName;
  if (recordKeys.has(recordKey)) {
    throw new Error(
      `[HMR] Component '${recordKey}' appears more than once in one update batch.`,
    );
  }
  if (elementNames.has(elementName)) {
    throw new Error(
      `[HMR] Custom element '${elementName}' appears more than once in one update batch.`,
    );
  }
  recordKeys.add(recordKey);
  elementNames.add(elementName);

  const record = registry.records.get(recordKey);

  if (!record) {
    if (customElementRegistry.get(elementName)) {
      return {
        kind: "incompatible",
        result: incompatibleResult({
          elementName,
          reason: "component-already-defined-outside-hmr",
        }),
      };
    }

    const nextRecord = {
      componentClass: null,
      componentId: recordKey,
      definition,
      deps,
      fingerprint,
      instances: new Set(),
      revision: 1,
    };
    const componentClass = createComponent(componentConfig, deps, {
      hotRecord: nextRecord,
    });
    nextRecord.componentClass = componentClass;

    return {
      kind: "define",
      elementName,
      nextRecord,
      recordKey,
      result: {
        status: "defined",
        elementName,
        componentClass,
      },
    };
  }

  const incompatibilityReason = getIncompatibilityReason({
    record,
    definition,
    deps,
  });
  if (incompatibilityReason) {
    return {
      kind: "incompatible",
      result: incompatibleResult({
        elementName,
        reason: incompatibilityReason,
      }),
    };
  }

  if (customElementRegistry.get(elementName) !== record.componentClass) {
    return {
      kind: "incompatible",
      result: incompatibleResult({
        elementName,
        reason: "component-registry-mismatch",
      }),
    };
  }

  if (
    fingerprint !== undefined &&
    Object.is(record.fingerprint, fingerprint) &&
    haveSameModuleReferences(record.definition, definition) &&
    haveSameDependencyValues(record.deps, deps)
  ) {
    return {
      kind: "unchanged",
      result: {
        status: "unchanged",
        elementName,
        componentClass: record.componentClass,
      },
    };
  }

  if (
    record.instances.size > 0 &&
    (hasMountLifecycle(record.definition) || hasMountLifecycle(definition))
  ) {
    let reason = "live-mount-lifecycle-requires-reload";
    if (mountLifecycleChanged(record.definition, definition)) {
      reason = "mount-lifecycle-changed";
    } else if (!haveSameDependencyValues(record.deps, deps)) {
      reason = "mount-dependencies-changed";
    }
    return {
      kind: "incompatible",
      result: incompatibleResult({ elementName, reason }),
    };
  }

  const retainedDeps = retainFrameworkRuntimeDeps({
    previousDeps: record.deps,
    nextDeps: deps,
  });
  const nextRevision = record.revision + 1;

  const preparedInstanceUpdates = [];
  record.instances.forEach((instance) => {
    preparedInstanceUpdates.push(prepareInstanceUpdate({
      definition,
      elementName,
      instance,
      nextRevision,
      retainedDeps,
    }));
  });

  return {
    definition,
    elementName,
    fingerprint,
    kind: "update",
    nextRevision,
    preparedInstanceUpdates,
    record,
    retainedDeps,
    result: {
      status: "updated",
      elementName,
      componentClass: record.componentClass,
      updatedInstances: preparedInstanceUpdates.length,
    },
  };
};

const publishPreparedComponentUpdate = ({
  plan,
  registry,
}) => {
  if (plan.kind === "define") {
    registry.records.set(plan.recordKey, plan.nextRecord);
    return;
  }

  if (plan.kind !== "update") {
    return;
  }

  const {
    definition,
    fingerprint,
    nextRevision,
    record,
    retainedDeps,
  } = plan;
  record.definition = definition;
  record.deps = retainedDeps;
  record.fingerprint = fingerprint;
  record.revision = nextRevision;
};

const definePreparedComponentUpdate = ({ plan, customElementRegistry }) => {
  if (plan.kind !== "define") {
    return;
  }
  customElementRegistry.define(
    plan.elementName,
    plan.nextRecord.componentClass,
  );
};

const applyPreparedComponentUpdate = ({ plan }) => {
  if (plan.kind !== "update") {
    return;
  }

  const {
    definition,
    elementName,
    nextRevision,
    preparedInstanceUpdates,
    record,
    retainedDeps,
  } = plan;
  const preparedByInstance = new Map(
    preparedInstanceUpdates.map((update) => [update.instance, update]),
  );
  let updatedInstances = 0;

  [...record.instances].forEach((instance) => {
    if (instance?._hotRevision === nextRevision) {
      return;
    }
    const update = preparedByInstance.get(instance) || prepareInstanceUpdate({
      definition,
      elementName,
      instance,
      nextRevision,
      retainedDeps,
    });
    const { applyUpdate, preparedUpdate } = update;
    applyUpdate.call(instance, {
      definition,
      deps: retainedDeps,
      preparedUpdate,
      revision: nextRevision,
    });
    updatedInstances += 1;
  });

  plan.result.updatedInstances = updatedInstances;
};

export const defineOrUpdateComponents = ({ components } = {}) => {
  if (!Array.isArray(components)) {
    throw new Error("[HMR] Component update batch must be an array.");
  }

  const customElementRegistry = globalThis.customElements;
  if (!customElementRegistry) {
    throw new Error("[HMR] customElements is not available in this environment.");
  }

  const registry = getRegistry();
  const recordKeys = new Set();
  const elementNames = new Set();
  const plans = [];

  for (const registration of components) {
    const plan = prepareComponentUpdate({
      registration,
      registry,
      customElementRegistry,
      recordKeys,
      elementNames,
    });
    if (plan.kind === "incompatible") {
      return {
        ...plan.result,
        results: [],
      };
    }
    plans.push(plan);
  }

  // Publish the complete next registry before any custom-element definition
  // or live-instance render can synchronously construct another component in
  // this batch. Every constructor therefore observes one coherent revision.
  plans.forEach((plan) =>
    publishPreparedComponentUpdate({ plan, registry }));
  plans.forEach((plan) =>
    definePreparedComponentUpdate({ plan, customElementRegistry }));
  plans.forEach((plan) =>
    applyPreparedComponentUpdate({ plan }));

  return {
    status: "committed",
    results: plans.map((plan) => plan.result),
  };
};

export const defineOrUpdateComponent = (registration = {}) => {
  const batchResult = defineOrUpdateComponents({
    components: [registration],
  });
  if (batchResult.status === "incompatible") {
    const { results: _results, ...incompatible } = batchResult;
    return incompatible;
  }
  return batchResult.results[0];
};
