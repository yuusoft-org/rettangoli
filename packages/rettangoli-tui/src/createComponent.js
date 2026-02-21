import { h } from "snabbdom/build/h.js";
import { toCamelCase } from "./core/runtime/props.js";
import { validateSchemaContract } from "./core/schema/validateSchemaContract.js";
import createTuiPatch from "./createTuiPatch.js";
import { createTuiComponentClass } from "./tui/createTuiComponentClass.js";

const patch = createTuiPatch();

const createComponent = (
  { handlers, methods, constants, schema, view, store },
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

  return createTuiComponentClass({
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
