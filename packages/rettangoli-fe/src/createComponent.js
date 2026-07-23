import { toCamelCase } from "./core/runtime/props.js";
import { validateSchemaContract } from "./core/schema/validateSchemaContract.js";
import { createWebComponentClass } from "./web/createWebComponentClass.js";
import createWebPatch from "./createWebPatch.js";
import { h } from "snabbdom/build/h.js";

const patch = createWebPatch();

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

const createComponent = (
  componentConfig,
  deps,
  { hotRecord = null } = {},
) => {
  const definition = resolveComponentDefinition(componentConfig);

  return createWebComponentClass({
    ...definition,
    patch,
    h,
    deps,
    hotRecord,
  });
};

export default createComponent;
