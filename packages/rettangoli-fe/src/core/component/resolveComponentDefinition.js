/**
 * Turns the four-file component config (.view.yaml / .store.js / .handlers.js /
 * .schema.yaml) into a plain, target-agnostic definition object.
 *
 * This lives in `core/` deliberately. It is pure — no DOM, no patch, no
 * rendering — so any binding (browser, server, tooling) can resolve a component
 * without pulling in a render target. Keeping it in `createComponent.js` meant
 * every consumer of the definition also transitively imported the snabbdom
 * patch, which is what made the package unimportable outside a browser.
 *
 * Re-exported from `../../createComponent.js` for backwards compatibility.
 */

import { toCamelCase } from "../runtime/props.js";
import { validateSchemaContract } from "../schema/validateSchemaContract.js";

export const resolveComponentDefinition = (
  { handlers, methods, constants, schema, view, store },
) => {
  if (!view) {
    throw new Error("view is not defined");
  }

  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error("schema is required. Define component metadata in .schema.yaml.");
  }

  const resolvedSchema = schema;
  const { template, refs, styles } = view;

  validateSchemaContract({
    schema: resolvedSchema,
    methodExports: Object.keys(methods || {}),
  });

  const elementName = resolvedSchema.componentName;
  const propsSchema = resolvedSchema.propsSchema;
  const propsSchemaKeys = propsSchema?.properties
    ? [...new Set(Object.keys(propsSchema.properties).map((propKey) => toCamelCase(propKey)))]
    : [];

  return {
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
};
