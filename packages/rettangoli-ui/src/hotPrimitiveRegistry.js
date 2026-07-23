import {
  HOT_PRIMITIVE_PREPARE,
  HOT_PRIMITIVE_PREPARE_STATIC,
} from "./hotPrimitiveContract.js";

export {
  HOT_PRIMITIVE_PREPARE,
  HOT_PRIMITIVE_PREPARE_STATIC,
} from "./hotPrimitiveContract.js";

const REGISTRY_KEY = Symbol.for("@rettangoli/ui/hot-primitive-registry");

const LIFECYCLE_CALLBACKS = new Set([
  "adoptedCallback",
  "attributeChangedCallback",
  "connectedCallback",
  "connectedMoveCallback",
  "disconnectedCallback",
  "formAssociatedCallback",
  "formDisabledCallback",
  "formResetCallback",
  "formStateRestoreCallback",
]);

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

const STATIC_FORWARDING_EXCLUSIONS = new Set([
  "arguments",
  "caller",
  "disabledFeatures",
  "formAssociated",
  "length",
  "name",
  "observedAttributes",
  "prototype",
  HOT_PRIMITIVE_PREPARE,
  HOT_PRIMITIVE_PREPARE_STATIC,
]);

const normalizeArray = (value) =>
  Array.isArray(value) ? [...value] : value == null ? [] : [...value];

const arraysEqual = (left, right) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

const describeValueShape = (value) => {
  if (value === null) {
    return "null";
  }
  if (typeof value === "function") {
    return `function:${Function.prototype.toString.call(value)}`;
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (typeof value !== "object") {
    return typeof value;
  }

  const elementName = value.localName || value.tagName;
  if (typeof elementName === "string") {
    return `element:${elementName.toLowerCase()}`;
  }

  return `object:${value.constructor?.name || "Object"}`;
};

const describeOwnState = (instance) =>
  Reflect.ownKeys(instance)
    .map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(instance, key);
      const printableKey =
        typeof key === "symbol" ? `symbol:${String(key.description)}` : key;
      const descriptorShape = descriptor && "value" in descriptor
        ? describeValueShape(descriptor.value)
        : `accessor:${Boolean(descriptor?.get)}:${Boolean(descriptor?.set)}`;

      return [
        printableKey,
        descriptorShape,
        Boolean(descriptor?.configurable),
        Boolean(descriptor?.enumerable),
        Boolean(descriptor?.writable),
      ];
    })
    .sort(([left], [right]) => String(left).localeCompare(String(right)));

const describeShadowNode = (node) => {
  if (node.nodeType === 3) {
    return ["#text", node.textContent];
  }
  if (node.nodeType === 8) {
    return ["#comment", node.textContent];
  }
  if (node.nodeType !== 1) {
    return [`#node:${node.nodeType}`];
  }

  return [
    node.localName,
    [...node.attributes]
      .map(({ name, value }) => [name, value])
      .sort(([left], [right]) => left.localeCompare(right)),
    [...node.childNodes].map(describeShadowNode),
  ];
};

const describeInstanceSchema = (instance) => ({
  ownState: describeOwnState(instance),
  shadow: instance.shadowRoot
    ? {
        delegatesFocus: Boolean(instance.shadowRoot.delegatesFocus),
        mode: instance.shadowRoot.mode,
        structure: [...instance.shadowRoot.childNodes].map(describeShadowNode),
      }
    : null,
});

const schemasEqual = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

const getBaseFamily = (elementClass, HTMLElementClass) => {
  const family = [];
  let prototype = Object.getPrototypeOf(elementClass.prototype);

  while (prototype) {
    const constructor = prototype.constructor;
    family.push(
      prototype === HTMLElementClass.prototype
        ? "HTMLElement"
        : constructor?.name || "(anonymous)",
    );
    if (prototype === HTMLElementClass.prototype) {
      break;
    }
    prototype = Object.getPrototypeOf(prototype);
  }

  return family;
};

const getConstructorSource = (elementClass) => {
  const source = Function.prototype.toString.call(elementClass);
  const match = /\bconstructor\s*\([^)]*\)\s*\{/.exec(source);
  if (!match) {
    return null;
  }

  const blockStart = source.indexOf("{", match.index);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = blockStart; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (lineComment) {
      if (character === "\n") {
        lineComment = false;
      }
      continue;
    }
    if (blockComment) {
      if (character === "*" && nextCharacter === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "/" && nextCharacter === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && nextCharacter === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") {
      depth += 1;
      continue;
    }
    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(match.index, index + 1);
      }
    }
  }

  return source.slice(match.index);
};

const getConstructorFamily = (elementClass, HTMLElementClass) => {
  const family = [];
  let constructor = elementClass;
  let isElementClass = true;

  while (constructor && constructor !== HTMLElementClass) {
    family.push([
      isElementClass ? "(element)" : constructor.name || "(anonymous)",
      getConstructorSource(constructor),
    ]);
    constructor = Object.getPrototypeOf(constructor);
    isElementClass = false;
  }

  return family;
};

const describeClassContract = (elementClass, HTMLElementClass) => ({
  baseFamily: getBaseFamily(elementClass, HTMLElementClass),
  constructorFamily: getConstructorFamily(elementClass, HTMLElementClass),
  disabledFeatures: normalizeArray(elementClass.disabledFeatures),
  formAssociated: Boolean(elementClass.formAssociated),
  observedAttributes: normalizeArray(elementClass.observedAttributes),
});

const findPrototypeDescriptor = (elementClass, propertyKey, HTMLElementClass) => {
  let prototype = elementClass.prototype;

  while (prototype && prototype !== HTMLElementClass.prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyKey);
    if (descriptor) {
      return descriptor;
    }
    prototype = Object.getPrototypeOf(prototype);
  }

  return null;
};

const collectForwardedPropertyKeys = (elementClass, HTMLElementClass) => {
  const keys = new Set();
  let prototype = elementClass.prototype;

  while (prototype && prototype !== HTMLElementClass.prototype) {
    Reflect.ownKeys(prototype).forEach((key) => {
      if (key !== "constructor" && !LIFECYCLE_CALLBACKS.has(key)) {
        keys.add(key);
      }
    });
    prototype = Object.getPrototypeOf(prototype);
  }

  return keys;
};

const collectForwardedStaticPropertyKeys = (elementClass, HTMLElementClass) => {
  const keys = new Set();
  let constructor = elementClass;

  while (constructor && constructor !== HTMLElementClass) {
    Reflect.ownKeys(constructor).forEach((key) => {
      if (!STATIC_FORWARDING_EXCLUSIONS.has(key)) {
        keys.add(key);
      }
    });
    constructor = Object.getPrototypeOf(constructor);
  }

  return keys;
};

const findStaticDescriptor = (elementClass, propertyKey, HTMLElementClass) => {
  let constructor = elementClass;

  while (constructor && constructor !== HTMLElementClass) {
    const descriptor = Object.getOwnPropertyDescriptor(constructor, propertyKey);
    if (descriptor) {
      return descriptor;
    }
    constructor = Object.getPrototypeOf(constructor);
  }

  return null;
};

const invokeCurrent = (record, instance, propertyKey, args) => {
  const descriptor = findPrototypeDescriptor(
    record.currentClass,
    propertyKey,
    record.HTMLElementClass,
  );
  if (!descriptor || typeof descriptor.value !== "function") {
    return undefined;
  }
  return Reflect.apply(descriptor.value, instance, args);
};

const createForwardingDescriptor = (record, propertyKey) => {
  const currentDescriptor = findPrototypeDescriptor(
    record.currentClass,
    propertyKey,
    record.HTMLElementClass,
  );

  if (typeof currentDescriptor?.value === "function") {
    return {
      configurable: true,
      enumerable: Boolean(currentDescriptor.enumerable),
      value(...args) {
        return invokeCurrent(record, this, propertyKey, args);
      },
      writable: true,
    };
  }

  return {
    configurable: true,
    enumerable: Boolean(currentDescriptor?.enumerable),
    get() {
      const descriptor = findPrototypeDescriptor(
        record.currentClass,
        propertyKey,
        record.HTMLElementClass,
      );
      if (!descriptor) {
        return undefined;
      }
      if (descriptor.get) {
        return Reflect.apply(descriptor.get, this, []);
      }
      return descriptor.value;
    },
    set(value) {
      const descriptor = findPrototypeDescriptor(
        record.currentClass,
        propertyKey,
        record.HTMLElementClass,
      );
      if (descriptor?.set) {
        Reflect.apply(descriptor.set, this, [value]);
        return;
      }
      Object.defineProperty(this, propertyKey, {
        configurable: true,
        enumerable: true,
        value,
        writable: true,
      });
    },
  };
};

const syncForwarders = (record) => {
  const nextKeys = collectForwardedPropertyKeys(
    record.currentClass,
    record.HTMLElementClass,
  );

  record.forwardedKeys.forEach((propertyKey) => {
    if (!nextKeys.has(propertyKey)) {
      Reflect.deleteProperty(record.shellClass.prototype, propertyKey);
    }
  });

  nextKeys.forEach((propertyKey) => {
    Object.defineProperty(
      record.shellClass.prototype,
      propertyKey,
      createForwardingDescriptor(record, propertyKey),
    );
  });
  record.forwardedKeys = nextKeys;
};

const createStaticForwardingDescriptor = (record, propertyKey) => {
  const currentDescriptor = findStaticDescriptor(
    record.currentClass,
    propertyKey,
    record.HTMLElementClass,
  );

  if (typeof currentDescriptor?.value === "function") {
    return {
      configurable: true,
      enumerable: Boolean(currentDescriptor.enumerable),
      value(...args) {
        const descriptor = findStaticDescriptor(
          record.currentClass,
          propertyKey,
          record.HTMLElementClass,
        );
        return typeof descriptor?.value === "function"
          ? Reflect.apply(descriptor.value, record.currentClass, args)
          : undefined;
      },
      writable: true,
    };
  }

  return {
    configurable: true,
    enumerable: Boolean(currentDescriptor?.enumerable),
    get() {
      const descriptor = findStaticDescriptor(
        record.currentClass,
        propertyKey,
        record.HTMLElementClass,
      );
      if (!descriptor) {
        return undefined;
      }
      return descriptor.get
        ? Reflect.apply(descriptor.get, record.currentClass, [])
        : descriptor.value;
    },
    set(value) {
      const descriptor = findStaticDescriptor(
        record.currentClass,
        propertyKey,
        record.HTMLElementClass,
      );
      if (descriptor?.set) {
        Reflect.apply(descriptor.set, record.currentClass, [value]);
        return;
      }
      if (descriptor?.writable) {
        record.currentClass[propertyKey] = value;
      }
    },
  };
};

const syncStaticForwarders = (record) => {
  const nextKeys = collectForwardedStaticPropertyKeys(
    record.currentClass,
    record.HTMLElementClass,
  );

  record.forwardedStaticKeys.forEach((propertyKey) => {
    if (!nextKeys.has(propertyKey)) {
      Reflect.deleteProperty(record.shellClass, propertyKey);
    }
  });

  nextKeys.forEach((propertyKey) => {
    Object.defineProperty(
      record.shellClass,
      propertyKey,
      createStaticForwardingDescriptor(record, propertyKey),
    );
  });
  record.forwardedStaticKeys = nextKeys;
};

const captureInstance = (record, instance) => {
  if (record.finalizationRegistry) {
    const reference = new WeakRef(instance);
    record.instanceReferences.add(reference);
    record.finalizationRegistry.register(instance, reference, reference);
  } else {
    record.instanceReferences.add(instance);
  }
  const schema = describeInstanceSchema(instance);
  if (!record.instanceSchema) {
    record.instanceSchema = schema;
  }
};

const getLiveInstances = (record) => {
  if (!record.finalizationRegistry) {
    return [...record.instanceReferences];
  }

  const instances = [];
  record.instanceReferences.forEach((reference) => {
    const instance = reference.deref();
    if (instance) {
      instances.push(instance);
    } else {
      record.instanceReferences.delete(reference);
    }
  });
  return instances;
};

const createShellClass = (record) => {
  const Shell = class RettangoliHotPrimitiveElement extends record.HTMLElementClass {
    constructor(...args) {
      const instance = Reflect.construct(record.currentClass, args, new.target);
      captureInstance(record, instance);
      return instance;
    }

    adoptedCallback(...args) {
      return invokeCurrent(record, this, "adoptedCallback", args);
    }

    attributeChangedCallback(...args) {
      return invokeCurrent(record, this, "attributeChangedCallback", args);
    }

    connectedCallback(...args) {
      return invokeCurrent(record, this, "connectedCallback", args);
    }

    connectedMoveCallback(...args) {
      return invokeCurrent(record, this, "connectedMoveCallback", args);
    }

    disconnectedCallback(...args) {
      return invokeCurrent(record, this, "disconnectedCallback", args);
    }

    formAssociatedCallback(...args) {
      return invokeCurrent(record, this, "formAssociatedCallback", args);
    }

    formDisabledCallback(...args) {
      return invokeCurrent(record, this, "formDisabledCallback", args);
    }

    formResetCallback(...args) {
      return invokeCurrent(record, this, "formResetCallback", args);
    }

    formStateRestoreCallback(...args) {
      return invokeCurrent(record, this, "formStateRestoreCallback", args);
    }
  };

  Object.defineProperties(Shell, {
    disabledFeatures: {
      configurable: false,
      value: Object.freeze([...record.contract.disabledFeatures]),
    },
    formAssociated: {
      configurable: false,
      value: record.contract.formAssociated,
    },
    observedAttributes: {
      configurable: false,
      value: Object.freeze([...record.contract.observedAttributes]),
    },
  });

  return Shell;
};

const describeContractMismatch = (tagName, previous, next) => {
  if (!arraysEqual(previous.observedAttributes, next.observedAttributes)) {
    return `${tagName} changed observedAttributes`;
  }
  if (!arraysEqual(previous.baseFamily, next.baseFamily)) {
    return `${tagName} changed its base element family`;
  }
  if (
    JSON.stringify(previous.constructorFamily) !==
    JSON.stringify(next.constructorFamily)
  ) {
    return `${tagName} changed constructor-owned behavior`;
  }
  if (previous.formAssociated !== next.formAssociated) {
    return `${tagName} changed formAssociated`;
  }
  if (!arraysEqual(previous.disabledFeatures, next.disabledFeatures)) {
    return `${tagName} changed disabledFeatures`;
  }
  return null;
};

const makeStylesheetOperation = ({ instance, previousClass, nextClass }) => {
  if (
    !instance.shadowRoot ||
    typeof nextClass.initializeStyleSheet !== "function"
  ) {
    return null;
  }

  nextClass.initializeStyleSheet();
  const previousSheet = previousClass.styleSheet;
  const nextSheet = nextClass.styleSheet;
  if (!nextSheet || previousSheet === nextSheet) {
    return null;
  }

  const previousSheets = [...(instance.shadowRoot.adoptedStyleSheets || [])];
  const nextSheets = previousSheets.includes(previousSheet)
    ? previousSheets.map((sheet) => sheet === previousSheet ? nextSheet : sheet)
    : [nextSheet, ...previousSheets.filter((sheet) => sheet !== nextSheet)];

  return {
    commit() {
      instance.shadowRoot.adoptedStyleSheets = nextSheets;
    },
    rollback() {
      instance.shadowRoot.adoptedStyleSheets = previousSheets;
    },
  };
};

const prepareInstanceOperations = ({
  instance,
  previousClass,
  nextClass,
}) => {
  const operations = [];
  const stylesheetOperation = makeStylesheetOperation({
    instance,
    previousClass,
    nextClass,
  });
  if (stylesheetOperation) {
    operations.push(stylesheetOperation);
  }

  const prepare = nextClass[HOT_PRIMITIVE_PREPARE];
  if (typeof prepare === "function") {
    const operation = prepare.call(nextClass, {
      instance,
      previousClass,
    });
    if (operation) {
      operations.push(operation);
    }
  }

  return operations;
};

const normalizeDefinition = (definition) => {
  if (!definition || typeof definition.tagName !== "string") {
    throw new TypeError("A hot primitive definition needs a tagName.");
  }
  if (typeof definition.elementClass !== "function") {
    throw new TypeError(`${definition.tagName} needs an elementClass.`);
  }
  return {
    elementClass: definition.elementClass,
    tagName: definition.tagName,
  };
};

const isValidAutonomousCustomElementName = (tagName) =>
  /^[a-z][.0-9_a-z-]*-[.0-9_a-z-]*$/.test(tagName) &&
  !RESERVED_CUSTOM_ELEMENT_NAMES.has(tagName);

const createRegistryState = ({ customElementsRegistry, HTMLElementClass }) => ({
  customElementsRegistry,
  HTMLElementClass,
  records: new Map(),
});

export const createHotPrimitiveRegistry = ({
  customElementsRegistry = globalThis.customElements,
  HTMLElementClass = globalThis.HTMLElement,
} = {}) => {
  if (!customElementsRegistry || typeof customElementsRegistry.define !== "function") {
    throw new TypeError("A CustomElementRegistry is required.");
  }
  if (typeof HTMLElementClass !== "function") {
    throw new TypeError("HTMLElement is required.");
  }

  const state = createRegistryState({
    customElementsRegistry,
    HTMLElementClass,
  });

  const defineOrUpdate = ({ definitions }) => {
    let normalizedDefinitions;
    try {
      normalizedDefinitions = definitions.map(normalizeDefinition);
    } catch (error) {
      return { error, status: "error" };
    }

    const duplicateTags = normalizedDefinitions
      .map(({ tagName }) => tagName)
      .filter((tagName, index, tags) => tags.indexOf(tagName) !== index);
    if (duplicateTags.length > 0) {
      return {
        message: `Duplicate primitive definition: ${duplicateTags[0]}`,
        reason: "duplicate-definition",
        status: "incompatible",
      };
    }
    const invalidTag = normalizedDefinitions.find(
      ({ tagName }) => !isValidAutonomousCustomElementName(tagName),
    );
    if (invalidTag) {
      return {
        message: `Invalid autonomous custom-element name: ${invalidTag.tagName}`,
        reason: "invalid-tag-name",
        status: "incompatible",
      };
    }
    const invalidElementClass = normalizedDefinitions.find(
      ({ elementClass }) =>
        !HTMLElementClass.prototype.isPrototypeOf(elementClass.prototype),
    );
    if (invalidElementClass) {
      return {
        message: `${invalidElementClass.tagName} does not extend HTMLElement`,
        reason: "invalid-element-class",
        status: "incompatible",
      };
    }
    const duplicateClass = normalizedDefinitions.find(
      ({ elementClass }, index) =>
        normalizedDefinitions.findIndex(
          (candidate) => candidate.elementClass === elementClass,
        ) !== index,
    );
    if (duplicateClass) {
      return {
        message: `${duplicateClass.tagName} reuses another primitive constructor`,
        reason: "duplicate-constructor",
        status: "incompatible",
      };
    }

    const preparedUpdates = [];
    const preparedCreates = [];

    try {
      for (const { tagName, elementClass } of normalizedDefinitions) {
        const record = state.records.get(tagName);
        const nextContract = describeClassContract(elementClass, HTMLElementClass);

        if (!record) {
          if (customElementsRegistry.get(tagName)) {
            return {
              message: `${tagName} was already defined outside the hot primitive registry`,
              reason: "foreign-definition",
              status: "incompatible",
            };
          }
          preparedCreates.push({ elementClass, nextContract, tagName });
          continue;
        }

        if (record.currentClass === elementClass) {
          continue;
        }

        const mismatch = describeContractMismatch(
          tagName,
          record.contract,
          nextContract,
        );
        if (mismatch) {
          return {
            message: mismatch,
            reason: "class-contract",
            status: "incompatible",
          };
        }

        if (record.instanceSchema) {
          const previousClass = record.currentClass;
          let candidate;
          record.currentClass = elementClass;
          try {
            candidate = Reflect.construct(
              elementClass,
              [],
              record.shellClass,
            );
          } finally {
            record.currentClass = previousClass;
          }
          const nextSchema = describeInstanceSchema(candidate);
          if (!schemasEqual(record.instanceSchema, nextSchema)) {
            return {
              message: `${tagName} changed its constructor state or shadow schema`,
              reason: "instance-schema",
              status: "incompatible",
            };
          }
        }

        const operations = [];
        const prepareStatic = elementClass[HOT_PRIMITIVE_PREPARE_STATIC];
        if (typeof prepareStatic === "function") {
          const operation = prepareStatic.call(elementClass, {
            previousClass: record.currentClass,
          });
          if (operation) {
            operations.push(operation);
          }
        }
        for (const instance of getLiveInstances(record)) {
          operations.push(...prepareInstanceOperations({
            instance,
            nextClass: elementClass,
            previousClass: record.currentClass,
          }));
        }
        preparedUpdates.push({
          elementClass,
          nextContract,
          operations,
          record,
        });
      }
    } catch (error) {
      return { error, status: "error" };
    }

    const createdRecords = [];
    const previousRecords = preparedUpdates.map(({ record }) => ({
      contract: record.contract,
      currentClass: record.currentClass,
      record,
    }));
    const committedOperations = [];

    try {
      for (const { elementClass, nextContract, tagName } of preparedCreates) {
        const record = {
          contract: nextContract,
          currentClass: elementClass,
          finalizationRegistry: typeof FinalizationRegistry === "function" &&
              typeof WeakRef === "function"
            ? null
            : false,
          forwardedKeys: new Set(),
          forwardedStaticKeys: new Set(),
          HTMLElementClass,
          instanceReferences: new Set(),
          instanceSchema: null,
          shellClass: null,
          tagName,
        };
        if (record.finalizationRegistry === null) {
          record.finalizationRegistry = new FinalizationRegistry((reference) => {
            record.instanceReferences.delete(reference);
          });
        }
        record.shellClass = createShellClass(record);
        syncForwarders(record);
        syncStaticForwarders(record);
        customElementsRegistry.define(tagName, record.shellClass);
        state.records.set(tagName, record);
        createdRecords.push(record);
      }

      preparedUpdates.forEach(({ elementClass, nextContract, record }) => {
        record.currentClass = elementClass;
        record.contract = nextContract;
        syncForwarders(record);
        syncStaticForwarders(record);
      });

      for (const { operations } of preparedUpdates) {
        for (const operation of operations) {
          committedOperations.push(operation);
          operation.commit?.();
        }
      }
    } catch (error) {
      for (const operation of committedOperations.reverse()) {
        try {
          operation.rollback?.();
        } catch {
          // Preserve the original update error.
        }
      }
      previousRecords.forEach(({ contract, currentClass, record }) => {
        record.contract = contract;
        record.currentClass = currentClass;
        syncForwarders(record);
        syncStaticForwarders(record);
      });
      return { error, status: "error" };
    }

    return {
      created: createdRecords.map(({ tagName }) => tagName),
      status: "updated",
      updated: preparedUpdates.map(({ record }) => record.tagName),
    };
  };

  return {
    defineOrUpdate,
    getRecord(tagName) {
      return state.records.get(tagName) || null;
    },
  };
};

const getGlobalRegistry = () => {
  if (!globalThis[REGISTRY_KEY]) {
    globalThis[REGISTRY_KEY] = createHotPrimitiveRegistry();
  }
  return globalThis[REGISTRY_KEY];
};

export const defineOrUpdatePrimitives = ({ definitions }) =>
  getGlobalRegistry().defineOrUpdate({ definitions });
