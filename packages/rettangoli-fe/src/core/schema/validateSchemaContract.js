export const validateSchemaContract = ({ schema, methodExports = [] }) => {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error("RTGL-SCHEMA-001: componentName is required.");
  }

  if (typeof schema.componentName !== "string" || schema.componentName.trim() === "") {
    throw new Error("RTGL-SCHEMA-001: componentName is required.");
  }

  if (Object.prototype.hasOwnProperty.call(schema, "attrsSchema")) {
    throw new Error("RTGL-SCHEMA-002: attrsSchema is not supported.");
  }

  if (Array.isArray(schema.methods)) {
    for (const method of schema.methods) {
      if (!method || typeof method.name !== "string" || method.name.trim() === "") {
        continue;
      }
      if (!methodExports.includes(method.name)) {
        throw new Error(`RTGL-SCHEMA-003: method '${method.name}' missing in .methods.js exports.`);
      }
    }
  }

  return true;
};
