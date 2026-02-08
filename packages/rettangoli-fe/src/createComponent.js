import { toCamelCase } from "./core/runtime/props.js";
import { validateSchemaContract } from "./core/schema/validateSchemaContract.js";
import { createWebComponentClass } from "./web/createWebComponentClass.js";

const createComponent = (
  { handlers, methods, constants, schema, view, store, patch, h },
  deps,
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

  if (!patch) {
    throw new Error("Patch is not defined");
  }

  if (!h) {
    throw new Error("h is not defined");
  }

  return createWebComponentClass({
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
  });
};

export default createComponent;
