export const validateSchemaContract = ({ schema, methodExports = [] }) => {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error("componentName is required.");
  }

  if (typeof schema.componentName !== "string" || schema.componentName.trim() === "") {
    throw new Error("componentName is required.");
  }

  if (Object.prototype.hasOwnProperty.call(schema, "attrsSchema")) {
    throw new Error("attrsSchema is not supported.");
  }

  if (Object.prototype.hasOwnProperty.call(schema, "methods")) {
    const methodsSchema = schema.methods;

    if (!methodsSchema || typeof methodsSchema !== "object" || Array.isArray(methodsSchema)) {
      throw new Error("methods must be an object schema with a properties map.");
    }

    if (
      Object.prototype.hasOwnProperty.call(methodsSchema, "type")
      && methodsSchema.type !== "object"
    ) {
      throw new Error("methods.type must be 'object'.");
    }

    if (
      !methodsSchema.properties
      || typeof methodsSchema.properties !== "object"
      || Array.isArray(methodsSchema.properties)
    ) {
      throw new Error("methods.properties must be an object keyed by method name.");
    }

    for (const methodName of Object.keys(methodsSchema.properties)) {
      if (!methodExports.includes(methodName)) {
        throw new Error(
          `method '${methodName}' is declared in schema but missing in .methods.js exports.`,
        );
      }
    }
  }

  return true;
};
