import { normalizeViewportField } from "./viewport.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function valueType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateOptionalString(value, path, options = {}) {
  const { allowEmpty = false } = options;
  if (value === undefined || value === null) {
    return;
  }
  assert(typeof value === "string", `"${path}" must be a string, got ${valueType(value)}.`);
  if (!allowEmpty) {
    assert(value.trim().length > 0, `"${path}" cannot be empty.`);
  }
}

function validateOptionalBoolean(value, path) {
  if (value === undefined || value === null) {
    return;
  }
  assert(typeof value === "boolean", `"${path}" must be a boolean, got ${valueType(value)}.`);
}

function validateOptionalNumber(value, path, options = {}) {
  const { integer = false, min, max } = options;
  if (value === undefined || value === null) {
    return;
  }

  assert(
    typeof value === "number" && Number.isFinite(value),
    `"${path}" must be a finite number, got ${valueType(value)} (${String(value)}).`,
  );

  if (integer) {
    assert(Number.isInteger(value), `"${path}" must be an integer, got ${value}.`);
  }
  if (min !== undefined) {
    assert(value >= min, `"${path}" must be >= ${min}, got ${value}.`);
  }
  if (max !== undefined) {
    assert(value <= max, `"${path}" must be <= ${max}, got ${value}.`);
  }
}

function validateOptionalEnum(value, path, allowedValues) {
  if (value === undefined || value === null) {
    return;
  }
  validateOptionalString(value, path);
  assert(
    allowedValues.includes(value),
    `"${path}" must be one of: ${allowedValues.join(", ")}. Got "${value}".`,
  );
}

function validateCaptureConfig(captureConfig, sourcePath) {
  if (captureConfig === undefined || captureConfig === null) {
    return;
  }

  assert(
    isPlainObject(captureConfig),
    `Invalid VT config in ${sourcePath}: "vt.capture" must be an object when provided, got ${valueType(captureConfig)}.`,
  );
  assert(
    Object.keys(captureConfig).length === 0,
    `Invalid VT config in ${sourcePath}: "vt.capture" is internal and no longer user-configurable. Remove this section.`,
  );
}

function validateServiceConfig(serviceConfig, sourcePath) {
  if (serviceConfig === undefined || serviceConfig === null) {
    return;
  }

  assert(
    isPlainObject(serviceConfig),
    `Invalid VT config in ${sourcePath}: "vt.service" must be an object when provided, got ${valueType(serviceConfig)}.`,
  );

  const allowedKeys = new Set(["start"]);
  const unknownKeys = Object.keys(serviceConfig).filter((key) => !allowedKeys.has(key));
  assert(
    unknownKeys.length === 0,
    `Invalid VT config in ${sourcePath}: "vt.service" supports only "start". Unknown keys: ${unknownKeys.join(", ")}.`,
  );

  validateOptionalString(serviceConfig.start, "vt.service.start");
  assert(
    typeof serviceConfig.start === "string" && serviceConfig.start.trim().length > 0,
    `Invalid VT config in ${sourcePath}: "vt.service.start" is required when "vt.service" is provided.`,
  );
}

const LEGACY_CAPTURE_FIELDS = {
  screenshotWaitTime: true,
  waitSelector: true,
  waitStrategy: true,
  workerCount: true,
  isolationMode: true,
  navigationTimeout: true,
  readyTimeout: true,
  screenshotTimeout: true,
  maxRetries: true,
  recycleEvery: true,
  metricsPath: true,
  headless: true,
};

const SECTION_PAGE_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

function assertNoLegacyCaptureFields(vtConfig, sourcePath) {
  for (const legacyField of Object.keys(LEGACY_CAPTURE_FIELDS)) {
    if (Object.prototype.hasOwnProperty.call(vtConfig, legacyField)) {
      throw new Error(
        `Invalid VT config in ${sourcePath}: "vt.${legacyField}" was removed and is no longer user-configurable.`,
      );
    }
  }
}

function assertValidSectionPageKey(value, path) {
  assert(
    typeof value === "string" && value.trim().length > 0,
    `"${path}" is required.`,
  );
  assert(
    SECTION_PAGE_KEY_PATTERN.test(value),
    `"${path}" must contain only letters, numbers, "-" or "_", and cannot include spaces.`,
  );
}

function validateSection(section, index) {
  const sectionPath = `vt.sections[${index}]`;
  assert(isPlainObject(section), `"${sectionPath}" must be an object, got ${valueType(section)}.`);

  validateOptionalString(section.title, `${sectionPath}.title`);
  assert(typeof section.title === "string" && section.title.trim().length > 0, `"${sectionPath}.title" is required.`);
  validateOptionalString(section.description, `${sectionPath}.description`, { allowEmpty: true });

  if (section.type !== undefined) {
    validateOptionalString(section.type, `${sectionPath}.type`);
    assert(
      section.type === "groupLabel",
      `"${sectionPath}.type" must be "groupLabel" when provided, got "${section.type}".`,
    );
  }

  if (section.type === "groupLabel") {
    assert(Array.isArray(section.items), `"${sectionPath}.items" must be an array for groupLabel sections.`);
    assert(section.items.length > 0, `"${sectionPath}.items" cannot be empty.`);

    section.items.forEach((item, itemIndex) => {
      const itemPath = `${sectionPath}.items[${itemIndex}]`;
      assert(isPlainObject(item), `"${itemPath}" must be an object, got ${valueType(item)}.`);
      validateOptionalString(item.title, `${itemPath}.title`);
      validateOptionalString(item.files, `${itemPath}.files`);
      validateOptionalString(item.description, `${itemPath}.description`, { allowEmpty: true });

      assert(typeof item.title === "string" && item.title.trim().length > 0, `"${itemPath}.title" is required.`);
      assert(typeof item.files === "string" && item.files.trim().length > 0, `"${itemPath}.files" is required.`);
      assertValidSectionPageKey(item.title, `${itemPath}.title`);
    });
    return;
  }

  validateOptionalString(section.files, `${sectionPath}.files`);
  assert(typeof section.files === "string" && section.files.trim().length > 0, `"${sectionPath}.files" is required.`);
  assertValidSectionPageKey(section.title, `${sectionPath}.title`);
}

function collectSectionPageKeys(vtConfig) {
  const keys = [];
  vtConfig.sections.forEach((section) => {
    if (section.type === "groupLabel" && Array.isArray(section.items)) {
      section.items.forEach((item) => keys.push(item.title));
      return;
    }
    if (section.files) {
      keys.push(section.title);
    }
  });
  return keys;
}

function assertUniqueSectionPageKeys(vtConfig, sourcePath) {
  const seen = new Map();
  const pageKeys = collectSectionPageKeys(vtConfig);

  pageKeys.forEach((pageKey) => {
    const canonicalKey = pageKey.toLowerCase();
    const existing = seen.get(canonicalKey);
    if (existing) {
      throw new Error(
        `Invalid VT config in ${sourcePath}: section page key "${pageKey}" conflicts with "${existing}". Page keys must be unique (case-insensitive).`,
      );
    }
    seen.set(canonicalKey, pageKey);
  });
}

function assertNoUnknownStepKeys(stepObject, stepPath, allowedKeys) {
  const unknownKeys = Object.keys(stepObject).filter((key) => !allowedKeys.has(key));
  assert(
    unknownKeys.length === 0,
    `"${stepPath}" has unknown keys: ${unknownKeys.join(", ")}.`,
  );
}

function validateStructuredActionStep(step, stepPath) {
  validateOptionalString(step.action, `${stepPath}.action`);
  assert(
    typeof step.action === "string" && step.action.trim().length > 0,
    `"${stepPath}.action" is required.`,
  );

  const action = step.action.trim();
  const allowedActions = [
    "assert",
    "blur",
    "check",
    "clear",
    "click",
    "customEvent",
    "dblclick",
    "focus",
    "goto",
    "hover",
    "keypress",
    "mouseDown",
    "mouseUp",
    "move",
    "rclick",
    "rightMouseDown",
    "rightMouseUp",
    "scroll",
    "select",
    "selectOption",
    "setViewport",
    "screenshot",
    "uncheck",
    "upload",
    "wait",
    "waitFor",
    "write",
  ];

  assert(
    allowedActions.includes(action),
    `"${stepPath}.action" must be one of: ${allowedActions.join(", ")}.`,
  );

  if (action === "assert") {
    assertNoUnknownStepKeys(
      step,
      stepPath,
      new Set(["action", "type", "match", "selector", "timeoutMs", "value", "global", "fn", "args"]),
    );
    const assertConfig = { ...step };
    delete assertConfig.action;
    validateAssertObject(assertConfig, `${stepPath}`);
    return;
  }

  if (action === "select") {
    assertNoUnknownStepKeys(step, stepPath, new Set(["action", "testId", "steps"]));
    validateOptionalString(step.testId, `${stepPath}.testId`);
    assert(
      typeof step.testId === "string" && step.testId.trim().length > 0,
      `"${stepPath}.testId" is required for action=select.`,
    );
    assert(Array.isArray(step.steps), `"${stepPath}.steps" must be an array for action=select.`);
    step.steps.forEach((nestedStep, nestedIndex) => {
      const nestedPath = `${stepPath}.steps[${nestedIndex}]`;
      if (typeof nestedStep === "string") {
        assert(nestedStep.trim().length > 0, `"${nestedPath}" cannot be empty.`);
        return;
      }
      validateStepObject(nestedStep, nestedPath);
    });
    return;
  }

  if (action === "click" || action === "dblclick" || action === "hover" || action === "rclick") {
    assertNoUnknownStepKeys(step, stepPath, new Set(["action", "x", "y"]));
    const hasX = Object.prototype.hasOwnProperty.call(step, "x");
    const hasY = Object.prototype.hasOwnProperty.call(step, "y");
    assert(hasX === hasY, `"${stepPath}" requires both "x" and "y" together when provided.`);
    if (hasX) {
      validateOptionalNumber(step.x, `${stepPath}.x`);
      validateOptionalNumber(step.y, `${stepPath}.y`);
    }
    return;
  }

  if (action === "move") {
    assertNoUnknownStepKeys(step, stepPath, new Set(["action", "x", "y"]));
    validateOptionalNumber(step.x, `${stepPath}.x`);
    validateOptionalNumber(step.y, `${stepPath}.y`);
    assert(typeof step.x === "number", `"${stepPath}.x" is required for action=move.`);
    assert(typeof step.y === "number", `"${stepPath}.y" is required for action=move.`);
    return;
  }

  if (action === "scroll") {
    assertNoUnknownStepKeys(step, stepPath, new Set(["action", "deltaX", "deltaY"]));
    validateOptionalNumber(step.deltaX, `${stepPath}.deltaX`);
    validateOptionalNumber(step.deltaY, `${stepPath}.deltaY`);
    assert(typeof step.deltaX === "number", `"${stepPath}.deltaX" is required for action=scroll.`);
    assert(typeof step.deltaY === "number", `"${stepPath}.deltaY" is required for action=scroll.`);
    return;
  }

  if (action === "goto") {
    assertNoUnknownStepKeys(step, stepPath, new Set(["action", "url"]));
    validateOptionalString(step.url, `${stepPath}.url`);
    assert(
      typeof step.url === "string" && step.url.trim().length > 0,
      `"${stepPath}.url" is required for action=goto.`,
    );
    return;
  }

  if (action === "keypress") {
    assertNoUnknownStepKeys(step, stepPath, new Set(["action", "key"]));
    validateOptionalString(step.key, `${stepPath}.key`);
    assert(
      typeof step.key === "string" && step.key.trim().length > 0,
      `"${stepPath}.key" is required for action=keypress.`,
    );
    return;
  }

  if (action === "wait") {
    assertNoUnknownStepKeys(step, stepPath, new Set(["action", "ms"]));
    validateOptionalNumber(step.ms, `${stepPath}.ms`, { min: 0 });
    assert(typeof step.ms === "number", `"${stepPath}.ms" is required for action=wait.`);
    return;
  }

  if (action === "setViewport") {
    assertNoUnknownStepKeys(step, stepPath, new Set(["action", "width", "height"]));
    validateOptionalNumber(step.width, `${stepPath}.width`, { integer: true, min: 1 });
    validateOptionalNumber(step.height, `${stepPath}.height`, { integer: true, min: 1 });
    assert(typeof step.width === "number", `"${stepPath}.width" is required for action=setViewport.`);
    assert(typeof step.height === "number", `"${stepPath}.height" is required for action=setViewport.`);
    return;
  }

  if (action === "write") {
    assertNoUnknownStepKeys(step, stepPath, new Set(["action", "value"]));
    validateOptionalString(step.value, `${stepPath}.value`);
    assert(typeof step.value === "string", `"${stepPath}.value" is required for action=write.`);
    return;
  }

  if (action === "upload") {
    assertNoUnknownStepKeys(step, stepPath, new Set(["action", "files"]));
    assert(Array.isArray(step.files), `"${stepPath}.files" must be an array for action=upload.`);
    assert(step.files.length > 0, `"${stepPath}.files" cannot be empty for action=upload.`);
    step.files.forEach((filePath, index) => {
      assert(typeof filePath === "string", `"${stepPath}.files[${index}]" must be a string.`);
      assert(filePath.trim().length > 0, `"${stepPath}.files[${index}]" cannot be empty.`);
    });
    return;
  }

  if (action === "waitFor") {
    assertNoUnknownStepKeys(step, stepPath, new Set(["action", "selector", "state", "timeoutMs"]));
    if (step.selector !== undefined) {
      validateOptionalString(step.selector, `${stepPath}.selector`);
    }
    if (step.state !== undefined) {
      validateOptionalEnum(step.state, `${stepPath}.state`, ["attached", "detached", "visible", "hidden"]);
    }
    if (step.timeoutMs !== undefined) {
      validateOptionalNumber(step.timeoutMs, `${stepPath}.timeoutMs`, { integer: true, min: 0 });
    }
    return;
  }

  if (action === "selectOption") {
    assertNoUnknownStepKeys(step, stepPath, new Set(["action", "value", "label", "index"]));
    if (step.value !== undefined) {
      validateOptionalString(step.value, `${stepPath}.value`);
    }
    if (step.label !== undefined) {
      validateOptionalString(step.label, `${stepPath}.label`);
    }
    if (step.index !== undefined) {
      validateOptionalNumber(step.index, `${stepPath}.index`);
    }
    const chosen = [step.value !== undefined, step.label !== undefined, step.index !== undefined]
      .filter(Boolean)
      .length;
    assert(
      chosen === 1,
      `"${stepPath}" for action=selectOption requires exactly one of "value", "label", or "index".`,
    );
    return;
  }

  if (action === "customEvent") {
    assertNoUnknownStepKeys(step, stepPath, new Set(["action", "name", "detail"]));
    validateOptionalString(step.name, `${stepPath}.name`);
    assert(
      typeof step.name === "string" && step.name.trim().length > 0,
      `"${stepPath}.name" is required for action=customEvent.`,
    );
    if (step.detail !== undefined) {
      assert(
        isPlainObject(step.detail),
        `"${stepPath}.detail" must be an object when provided.`,
      );
    }
    return;
  }

  assertNoUnknownStepKeys(step, stepPath, new Set(["action"]));
}

function validateStepObject(step, stepPath) {
  assert(isPlainObject(step), `"${stepPath}" must be an object with one key or a string.`);

  if (Object.prototype.hasOwnProperty.call(step, "action")) {
    validateStructuredActionStep(step, stepPath);
    return;
  }

  const keys = Object.keys(step);
  assert(
    keys.length === 1,
    `"${stepPath}" must have exactly one key (e.g. "select my-id"), got ${keys.length}.`,
  );

  const [stepKey] = keys;
  validateOptionalString(stepKey, `${stepPath} key`);

  if (stepKey === "assert") {
    validateAssertObject(step[stepKey], `${stepPath}.assert`);
    return;
  }

  const nestedSteps = step[stepKey];
  assert(Array.isArray(nestedSteps), `"${stepPath}.${stepKey}" must be an array of step values.`);
  nestedSteps.forEach((nestedStep, nestedIndex) => {
    const nestedPath = `${stepPath}.${stepKey}[${nestedIndex}]`;
    if (typeof nestedStep === "string") {
      assert(nestedStep.trim().length > 0, `"${nestedPath}" cannot be empty.`);
      return;
    }
    validateStepObject(nestedStep, nestedPath);
  });
}

function validateAssertObject(assertObject, assertPath) {
  assert(isPlainObject(assertObject), `"${assertPath}" must be an object.`);

  validateOptionalString(assertObject.type, `${assertPath}.type`);
  assert(
    typeof assertObject.type === "string" && assertObject.type.trim().length > 0,
    `"${assertPath}.type" is required.`,
  );

  const type = assertObject.type;
  assert(
    ["url", "exists", "visible", "hidden", "text", "js"].includes(type),
    `"${assertPath}.type" must be one of: url, exists, visible, hidden, text, js.`,
  );

  if (assertObject.match !== undefined) {
    validateOptionalEnum(assertObject.match, `${assertPath}.match`, ["includes", "equals"]);
  }
  if (assertObject.timeoutMs !== undefined) {
    validateOptionalNumber(assertObject.timeoutMs, `${assertPath}.timeoutMs`, { integer: true, min: 0 });
  }

  if (type === "url") {
    validateOptionalString(assertObject.value, `${assertPath}.value`);
    assert(
      typeof assertObject.value === "string" && assertObject.value.length > 0,
      `"${assertPath}.value" is required for type=url and must be a non-empty string.`,
    );
    return;
  }

  if (type === "exists" || type === "visible" || type === "hidden") {
    if (assertObject.selector !== undefined) {
      validateOptionalString(assertObject.selector, `${assertPath}.selector`);
    }
    return;
  }

  if (type === "text") {
    if (assertObject.selector !== undefined) {
      validateOptionalString(assertObject.selector, `${assertPath}.selector`);
    }
    validateOptionalString(assertObject.value, `${assertPath}.value`);
    assert(
      typeof assertObject.value === "string",
      `"${assertPath}.value" is required for type=text and must be a string.`,
    );
    return;
  }

  if (type === "js") {
    if (assertObject.global !== undefined) {
      validateOptionalString(assertObject.global, `${assertPath}.global`);
    }
    if (assertObject.fn !== undefined) {
      validateOptionalString(assertObject.fn, `${assertPath}.fn`);
    }

    const hasGlobal = typeof assertObject.global === "string" && assertObject.global.length > 0;
    const hasFn = typeof assertObject.fn === "string" && assertObject.fn.length > 0;
    assert(
      hasGlobal !== hasFn,
      `"${assertPath}" for type=js requires exactly one of "global" or "fn".`,
    );

    assert(
      Object.prototype.hasOwnProperty.call(assertObject, "value"),
      `"${assertPath}.value" is required for type=js.`,
    );

    if (assertObject.args !== undefined) {
      assert(
        Array.isArray(assertObject.args),
        `"${assertPath}.args" must be an array when provided.`,
      );
    }
  }
}

export function validateVtConfig(vtConfig, sourcePath = "rettangoli.config.yaml") {
  assert(
    isPlainObject(vtConfig),
    `Invalid VT config in ${sourcePath}: "vt" must be an object, got ${valueType(vtConfig)}.`,
  );

  validateOptionalString(vtConfig.path, "vt.path");
  validateOptionalString(vtConfig.url, "vt.url");
  validateOptionalString(vtConfig.name, "vt.name", { allowEmpty: true });
  validateOptionalString(vtConfig.description, "vt.description", { allowEmpty: true });
  validateOptionalString(vtConfig.compareMethod, "vt.compareMethod");
  validateOptionalBoolean(vtConfig.skipScreenshots, "vt.skipScreenshots");
  validateOptionalNumber(vtConfig.port, "vt.port", { integer: true, min: 1, max: 65535 });
  validateOptionalNumber(vtConfig.concurrency, "vt.concurrency", { integer: true, min: 1 });
  validateOptionalNumber(vtConfig.timeout, "vt.timeout", { integer: true, min: 1 });
  validateOptionalString(vtConfig.waitEvent, "vt.waitEvent");
  normalizeViewportField(vtConfig.viewport, "vt.viewport");
  validateOptionalNumber(vtConfig.colorThreshold, "vt.colorThreshold", { min: 0, max: 1 });
  validateOptionalNumber(vtConfig.diffThreshold, "vt.diffThreshold", { min: 0, max: 100 });
  validateServiceConfig(vtConfig.service, sourcePath);
  if (vtConfig.service) {
    assert(
      typeof vtConfig.url === "string" && vtConfig.url.trim().length > 0,
      `Invalid VT config in ${sourcePath}: "vt.url" is required when "vt.service" is configured.`,
    );
  }
  assertNoLegacyCaptureFields(vtConfig, sourcePath);
  validateCaptureConfig(vtConfig.capture, sourcePath);

  assert(Array.isArray(vtConfig.sections), `Invalid VT config in ${sourcePath}: "vt.sections" is required and must be an array.`);
  assert(vtConfig.sections.length > 0, `Invalid VT config in ${sourcePath}: "vt.sections" cannot be empty.`);
  vtConfig.sections.forEach(validateSection);
  assertUniqueSectionPageKeys(vtConfig, sourcePath);

  return vtConfig;
}

export function validateFrontMatter(frontMatter, specPath) {
  if (frontMatter === null || frontMatter === undefined) {
    return;
  }

  assert(
    isPlainObject(frontMatter),
    `Invalid front matter in "${specPath}": expected an object, got ${valueType(frontMatter)}.`,
  );

  validateOptionalString(frontMatter.title, `${specPath}: frontMatter.title`, { allowEmpty: true });
  validateOptionalString(frontMatter.description, `${specPath}: frontMatter.description`, { allowEmpty: true });
  validateOptionalString(frontMatter.template, `${specPath}: frontMatter.template`);
  validateOptionalString(frontMatter.url, `${specPath}: frontMatter.url`);
  validateOptionalString(frontMatter.waitEvent, `${specPath}: frontMatter.waitEvent`);
  validateOptionalString(frontMatter.waitSelector, `${specPath}: frontMatter.waitSelector`);
  normalizeViewportField(frontMatter.viewport, `${specPath}: frontMatter.viewport`);
  validateOptionalEnum(
    frontMatter.waitStrategy,
    `${specPath}: frontMatter.waitStrategy`,
    ["networkidle", "load", "event", "selector"],
  );
  validateOptionalBoolean(frontMatter.skipScreenshot, `${specPath}: frontMatter.skipScreenshot`);

  if (frontMatter.waitStrategy === "event") {
    assert(
      typeof frontMatter.waitEvent === "string" && frontMatter.waitEvent.trim().length > 0,
      `"${specPath}: frontMatter.waitEvent" is required when waitStrategy is "event".`,
    );
  }
  if (frontMatter.waitStrategy === "selector") {
    assert(
      typeof frontMatter.waitSelector === "string" && frontMatter.waitSelector.trim().length > 0,
      `"${specPath}: frontMatter.waitSelector" is required when waitStrategy is "selector".`,
    );
  }

  if (frontMatter.specs !== undefined) {
    assert(Array.isArray(frontMatter.specs), `"${specPath}: frontMatter.specs" must be an array of strings.`);
    frontMatter.specs.forEach((spec, index) => {
      const specPathField = `${specPath}: frontMatter.specs[${index}]`;
      assert(typeof spec === "string", `"${specPathField}" must be a string.`);
      assert(spec.trim().length > 0, `"${specPathField}" cannot be empty.`);
    });
  }

  if (frontMatter.steps !== undefined) {
    assert(Array.isArray(frontMatter.steps), `"${specPath}: frontMatter.steps" must be an array.`);
    frontMatter.steps.forEach((step, index) => {
      const stepPath = `${specPath}: frontMatter.steps[${index}]`;
      if (typeof step === "string") {
        assert(step.trim().length > 0, `"${stepPath}" cannot be empty.`);
        return;
      }
      validateStepObject(step, stepPath);
    });
  }
}

export function validateFiniteNumber(value, fieldName, options = {}) {
  validateOptionalNumber(value, fieldName, options);
  return value;
}
