// Fixed text of the generated browser entry (see frontendEntrySource.js).
// Each constant is emitted byte for byte after its `__NAME__` placeholders are
// filled. The uneven indentation of some lines is part of the emitted bytes.

// Placeholders: REGISTRATION_ORDER, HYDRATION_REGISTRATION_ORDER and
// HYDRATE_SELECTOR (JSON), TRANSACTION_START, REGISTER_COMPONENT and
// TRANSACTION_END (source text; the transaction lines are empty in builds).
export const REGISTRATION_SOURCE = `const __rtglRegistrationOrder = __REGISTRATION_ORDER__;
// Prerendered hosts upgrade as soon as they are defined, so a page that
// holds prerendered markup defines parents before the components they render.
const __rtglHydrationRegistrationOrder = __HYDRATION_REGISTRATION_ORDER__;
const __rtglHasServerMarkup =
  typeof document !== "undefined" &&
  document.querySelector(__HYDRATE_SELECTOR__) !== null;

__TRANSACTION_START__
(__rtglHasServerMarkup
  ? __rtglHydrationRegistrationOrder
  : __rtglRegistrationOrder
).forEach(([category, component]) => {
  const componentConfig = imports[category][component];
  const categoryDeps = {
    ...((deps && deps[category]) || {}),
    ...__rtglFrameworkDeps,
  };
  const elementName = componentConfig.schema?.componentName;
  if (!elementName) {
    throw new Error(
      \`[Build] Missing schema.componentName for \${category}/\${component}. Define it in .schema.yaml.\`,
    );
  }
  __REGISTER_COMPONENT__
});
__TRANSACTION_END__`;

export const BUILD_REGISTER_COMPONENT_SOURCE = `const webComponent = createComponent({ ...componentConfig }, categoryDeps);
    customElements.define(elementName, webComponent);`;

export const SERVE_REGISTER_COMPONENT_SOURCE = `__rtglComponentUpdateBatch.push({
      componentId: \`\${category}/\${component}\`,
      componentConfig: { ...componentConfig },
      deps: categoryDeps,
      fingerprint: __rtglComponentFingerprints[category][component],
    });`;

export const HMR_STATE_SOURCE = `const __rtglIsHmrUpdate = Boolean(
  import.meta.hot?.data.__rtglInitialized,
);
let __rtglHmrIncompatibleReason = null;
const __rtglComponentUpdateBatch = [];`;

// Serve only: the registration loop runs inside this try block; its end
// applies the batch, then commits the i18n catalogs.
export const HMR_TRANSACTION_START_SOURCE = "try {";

export const HMR_TRANSACTION_END_SOURCE = `const __rtglBatchResult = defineOrUpdateComponents({
    components: __rtglComponentUpdateBatch,
  });
  if (__rtglBatchResult?.status === "incompatible") {
    throw new Error(
      __rtglBatchResult.message || __rtglBatchResult.reason ||
        "A component cannot be updated without a reload.",
    );
  }
  __rtglCommitI18nUpdate();
  if (import.meta.hot) {
    import.meta.hot.data.__rtglInitialized = true;
  }
} catch (error) {
  if (!__rtglIsHmrUpdate) {
    throw error;
  }
  __rtglHmrIncompatibleReason =
    error instanceof Error ? error.message : String(error);
}`;

export const HMR_BOUNDARY_SOURCE = `export const __rtglHmrState = {
  incompatibleReason: __rtglHmrIncompatibleReason,
};

if (import.meta.hot) {
  import.meta.hot.accept((nextModule) => {
    const reason = nextModule?.__rtglHmrState?.incompatibleReason;
    if (reason) {
      import.meta.hot.invalidate(\`[Rettangoli HMR] \${reason}\`);
    }
  });
}`;

// Serve only, after `__rtglI18nCatalogs` and `__rtglI18nCatalogFingerprint`.
export const I18N_CATALOG_UPDATE_SOURCE = `const __rtglShouldReplaceI18nCatalogs =
  import.meta.hot?.data.__rtglI18nCatalogFingerprint !==
  __rtglI18nCatalogFingerprint;
const __rtglCommitI18nUpdate = () => {
  if (__rtglShouldReplaceI18nCatalogs) {
    __rtglI18nRuntime.replaceCatalogs(__rtglI18nCatalogs);
  }
  if (import.meta.hot) {
    import.meta.hot.data.__rtglI18nRuntime = __rtglI18nRuntime;
    if (__rtglShouldReplaceI18nCatalogs) {
      import.meta.hot.data.__rtglI18nCatalogFingerprint =
        __rtglI18nCatalogFingerprint;
    }
  }
};`;

export const NO_I18N_COMMIT_UPDATE_SOURCE = "const __rtglCommitI18nUpdate = () => {};";

export const I18N_FRAMEWORK_DEPS_SOURCE = `const __rtglFrameworkDeps = {
  __rtglI18nRuntime,
  locale: __rtglI18nRuntime.locale,
};`;

export const NO_I18N_FRAMEWORK_DEPS_SOURCE = "const __rtglFrameworkDeps = {};";

// Replaces every `__NAME__` placeholder in one pass. Values are inserted as
// they are (no `$&` patterns) and never scanned for placeholders themselves.
export const fillPlaceholders = (source, values) => {
  return source.replace(/__([A-Z][A-Z_]*)__/g, (placeholder, name) => {
    if (!Object.hasOwn(values, name)) {
      throw new Error(`Missing value for entry placeholder ${placeholder}.`);
    }
    return values[name];
  });
};
