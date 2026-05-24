const EXPRESSION_PATTERN = /\$\{([^}]*)\}/g;
const I18N_PATH_PATTERN = /^i18n\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)$/;
const SIMPLE_I18N_PATH_PATTERN = /^i18n((?:\.[A-Za-z_$][\w$]*)+)$/;

const createIssue = ({ message, expression, path }) => ({
  message,
  expression,
  path,
});

const createFindingKey = (finding) => `${finding.path}\u0000${finding.expression}`;

const extractTemplateExpressions = (text) => {
  const expressions = [];
  let match;
  EXPRESSION_PATTERN.lastIndex = 0;
  while ((match = EXPRESSION_PATTERN.exec(text)) !== null) {
    expressions.push(match[1].trim());
  }
  return expressions;
};

export const analyzeI18nExpression = ({ expression, path = "$" }) => {
  const startsFromI18nRoot = /^i18n(?:\b|\.)/.test(expression);
  const startsFromInternalI18nRoot = /^__rtglI18n(?:\b|\s*\()/.test(expression);

  if (!startsFromI18nRoot && !startsFromInternalI18nRoot) {
    return { references: [], issues: [] };
  }

  if (
    /^__rtglI18n\s*\(/.test(expression) ||
    /^i18n\s*\(/.test(expression) ||
    /^i18n(?:\.[A-Za-z_$][\w$]*)+\s*\(/.test(expression)
  ) {
    return {
      references: [],
      issues: [
        createIssue({
          expression,
          path,
          message: "i18n function calls are not supported.",
        }),
      ],
    };
  }

  const exactPathMatch = expression.match(I18N_PATH_PATTERN);
  if (exactPathMatch) {
    return {
      references: [
        {
          namespace: exactPathMatch[1],
          key: exactPathMatch[2],
          expression,
          path,
        },
      ],
      issues: [],
    };
  }

  const simplePathMatch = expression.match(SIMPLE_I18N_PATH_PATTERN);
  if (simplePathMatch) {
    const segments = simplePathMatch[1].split(".").filter(Boolean);
    const message = segments.length < 2
      ? "i18n references must use two levels: i18n.namespace.key."
      : "i18n references must not be deeper than i18n.namespace.key.";
    return {
      references: [],
      issues: [
        createIssue({
          expression,
          path,
          message,
        }),
      ],
    };
  }

  if (startsFromI18nRoot || startsFromInternalI18nRoot) {
    return {
      references: [],
      issues: [
        createIssue({
          expression,
          path,
          message: "i18n references must be direct paths: i18n.namespace.key.",
        }),
      ],
    };
  }

  return { references: [], issues: [] };
};

export const collectI18nReferencesFromView = ({
  value,
  path = "$",
  references = [],
  issues = [],
} = {}) => {
  if (typeof value === "string") {
    const expressions = extractTemplateExpressions(value);
    expressions.forEach((expression) => {
      const result = analyzeI18nExpression({ expression, path });
      references.push(...result.references);
      issues.push(...result.issues);
    });
    return { references, issues };
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectI18nReferencesFromView({
        value: item,
        path: `${path}[${index}]`,
        references,
        issues,
      });
    });
    return { references, issues };
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, childValue]) => {
      collectI18nReferencesFromView({
        value: key,
        path: `${path}.{key}`,
        references,
        issues,
      });
      collectI18nReferencesFromView({
        value: childValue,
        path: `${path}.${key}`,
        references,
        issues,
      });
    });
  }

  return { references, issues };
};

const collectEventPayloadI18nReferences = ({
  refs,
  references,
  issues,
}) => {
  if (!refs || typeof refs !== "object" || Array.isArray(refs)) {
    return;
  }

  Object.entries(refs).forEach(([refKey, refConfig]) => {
    const eventListeners = refConfig?.eventListeners;
    if (!eventListeners || typeof eventListeners !== "object" || Array.isArray(eventListeners)) {
      return;
    }

    Object.entries(eventListeners).forEach(([eventType, eventConfig]) => {
      if (
        !eventConfig
        || typeof eventConfig !== "object"
        || Array.isArray(eventConfig)
        || !Object.prototype.hasOwnProperty.call(eventConfig, "payload")
      ) {
        return;
      }

      collectI18nReferencesFromView({
        value: eventConfig.payload,
        path: `$.refs.${refKey}.eventListeners.${eventType}.payload`,
        references,
        issues,
      });
    });
  });
};

export const collectRenderableI18nReferencesFromView = ({ viewYaml } = {}) => {
  const references = [];
  const issues = [];

  if (viewYaml && typeof viewYaml === "object" && !Array.isArray(viewYaml)) {
    if (Object.prototype.hasOwnProperty.call(viewYaml, "template")) {
      collectI18nReferencesFromView({
        value: viewYaml.template,
        path: "$.template",
        references,
        issues,
      });
    }

    collectEventPayloadI18nReferences({
      refs: viewYaml.refs,
      references,
      issues,
    });
  } else {
    collectI18nReferencesFromView({
      value: viewYaml,
      references,
      issues,
    });
  }

  return { references, issues };
};

export const validateViewI18nReferences = ({
  viewYaml,
  componentLabel,
  filePath,
  i18nContext = { enabled: false },
} = {}) => {
  const supported = collectRenderableI18nReferencesFromView({
    viewYaml,
  });
  const all = collectI18nReferencesFromView({
    value: viewYaml,
  });
  const supportedFindingKeys = new Set([
    ...supported.references.map(createFindingKey),
    ...supported.issues.map(createFindingKey),
  ]);

  const unsupportedFindings = [
    ...all.references,
    ...all.issues,
  ].filter((finding) => !supportedFindingKeys.has(createFindingKey(finding)));

  const errors = unsupportedFindings.map((finding) => ({
    code: "RTGL-I18N-004",
    message: `${componentLabel}: unsupported i18n expression "\${${finding.expression}}" at ${finding.path}. i18n references are supported only in template values, template bindings, and event listener payloads.`,
    filePath,
  }));

  supported.issues.forEach((issue) => {
    errors.push({
      code: "RTGL-I18N-001",
      message: `${componentLabel}: invalid i18n expression "\${${issue.expression}}": ${issue.message}`,
      filePath,
    });
  });

  const references = supported.references;

  if (errors.length > 0) {
    return errors;
  }

  if (!i18nContext?.enabled && references.length > 0) {
    references.forEach((reference) => {
      errors.push({
        code: "RTGL-I18N-002",
        message: `${componentLabel}: i18n reference "\${${reference.expression}}" requires fe.i18n configuration.`,
        filePath,
      });
    });
    return errors;
  }

  if (i18nContext?.enabled) {
    const defaultCatalog = i18nContext.catalogs?.[i18nContext.defaultLocale] || {};
    references.forEach((reference) => {
      if (!Object.prototype.hasOwnProperty.call(defaultCatalog, reference.namespace)) {
        errors.push({
          code: "RTGL-I18N-003",
          message: `${componentLabel}: missing i18n namespace "${reference.namespace}" in default locale "${i18nContext.defaultLocale}".`,
          filePath,
        });
        return;
      }

      const namespaceMessages = defaultCatalog[reference.namespace] || {};
      if (!Object.prototype.hasOwnProperty.call(namespaceMessages, reference.key)) {
        errors.push({
          code: "RTGL-I18N-003",
          message: `${componentLabel}: missing i18n key "${reference.namespace}.${reference.key}" in default locale "${i18nContext.defaultLocale}".`,
          filePath,
        });
      }
    });
  }

  return errors;
};
