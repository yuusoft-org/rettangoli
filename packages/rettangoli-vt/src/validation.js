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
    `Invalid VT config in ${sourcePath}: "vt.capture" must be an object, got ${valueType(captureConfig)}.`,
  );

  validateOptionalNumber(captureConfig.workerCount, "vt.capture.workerCount", { integer: true, min: 1 });
  validateOptionalEnum(captureConfig.engine, "vt.capture.engine", ["pool"]);
  validateOptionalNumber(captureConfig.screenshotWaitTime, "vt.capture.screenshotWaitTime", { integer: true, min: 0 });
  validateOptionalString(captureConfig.waitEvent, "vt.capture.waitEvent");
  validateOptionalString(captureConfig.waitSelector, "vt.capture.waitSelector");
  validateOptionalEnum(
    captureConfig.waitStrategy,
    "vt.capture.waitStrategy",
    ["networkidle", "load", "event", "selector"],
  );
  validateOptionalEnum(captureConfig.isolationMode, "vt.capture.isolationMode", ["strict", "fast"]);
  validateOptionalNumber(captureConfig.navigationTimeout, "vt.capture.navigationTimeout", { integer: true, min: 1 });
  validateOptionalNumber(captureConfig.readyTimeout, "vt.capture.readyTimeout", { integer: true, min: 1 });
  validateOptionalNumber(captureConfig.screenshotTimeout, "vt.capture.screenshotTimeout", { integer: true, min: 1 });
  validateOptionalNumber(captureConfig.maxRetries, "vt.capture.maxRetries", { integer: true, min: 0 });
  validateOptionalNumber(captureConfig.recycleEvery, "vt.capture.recycleEvery", { integer: true, min: 0 });
  validateOptionalString(captureConfig.metricsPath, "vt.capture.metricsPath");
  validateOptionalBoolean(captureConfig.headless, "vt.capture.headless");

  if (captureConfig.waitStrategy === "event") {
    assert(
      typeof captureConfig.waitEvent === "string" && captureConfig.waitEvent.trim().length > 0,
      `"vt.capture.waitEvent" is required when "vt.capture.waitStrategy" is "event".`,
    );
  }
  if (captureConfig.waitStrategy === "selector") {
    assert(
      typeof captureConfig.waitSelector === "string" && captureConfig.waitSelector.trim().length > 0,
      `"vt.capture.waitSelector" is required when "vt.capture.waitStrategy" is "selector".`,
    );
  }
}

const LEGACY_CAPTURE_FIELDS = {
  screenshotWaitTime: "vt.capture.screenshotWaitTime",
  waitEvent: "vt.capture.waitEvent",
  waitSelector: "vt.capture.waitSelector",
  waitStrategy: "vt.capture.waitStrategy",
  concurrency: "vt.capture.workerCount",
  workerCount: "vt.capture.workerCount",
  isolationMode: "vt.capture.isolationMode",
  navigationTimeout: "vt.capture.navigationTimeout",
  readyTimeout: "vt.capture.readyTimeout",
  screenshotTimeout: "vt.capture.screenshotTimeout",
  maxRetries: "vt.capture.maxRetries",
  recycleEvery: "vt.capture.recycleEvery",
  metricsPath: "vt.capture.metricsPath",
  headless: "vt.capture.headless",
};

const SECTION_PAGE_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

function assertNoLegacyCaptureFields(vtConfig, sourcePath) {
  for (const [legacyField, newPath] of Object.entries(LEGACY_CAPTURE_FIELDS)) {
    if (Object.prototype.hasOwnProperty.call(vtConfig, legacyField)) {
      throw new Error(
        `Invalid VT config in ${sourcePath}: "vt.${legacyField}" was removed. Use "${newPath}" instead.`,
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

function validateStepObject(step, stepPath) {
  assert(isPlainObject(step), `"${stepPath}" must be an object with one key or a string.`);
  const keys = Object.keys(step);
  assert(
    keys.length === 1,
    `"${stepPath}" must have exactly one key (e.g. "select my-id"), got ${keys.length}.`,
  );

  const [blockCommand] = keys;
  validateOptionalString(blockCommand, `${stepPath} key`);

  const nestedSteps = step[blockCommand];
  assert(Array.isArray(nestedSteps), `"${stepPath}.${blockCommand}" must be an array of step strings.`);
  nestedSteps.forEach((nestedStep, nestedIndex) => {
    const nestedPath = `${stepPath}.${blockCommand}[${nestedIndex}]`;
    assert(typeof nestedStep === "string", `"${nestedPath}" must be a string step command.`);
    assert(nestedStep.trim().length > 0, `"${nestedPath}" cannot be empty.`);
  });
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
  validateOptionalNumber(vtConfig.colorThreshold, "vt.colorThreshold", { min: 0, max: 1 });
  validateOptionalNumber(vtConfig.diffThreshold, "vt.diffThreshold", { min: 0, max: 100 });
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
