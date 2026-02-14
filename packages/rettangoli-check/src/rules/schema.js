import { getModelFilePath, getYamlPathLine, isObjectRecord } from "./shared.js";

const CUSTOM_ELEMENT_NAME_REGEX = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;

export const runSchemaRules = ({ models = [] }) => {
  const diagnostics = [];
  const componentNameOwners = new Map();

  models.forEach((model) => {
    const schema = model?.schema?.yaml;
    const schemaPath = getModelFilePath({ model, fileType: "schema" });
    const schemaKeyPathLines = model?.schema?.yamlKeyPathLines || new Map();
    const componentNameLine = getYamlPathLine(schemaKeyPathLines, ["componentName"]);

    if (schema === null || schema === undefined) {
      return;
    }

    if (!isObjectRecord(schema)) {
      diagnostics.push({
        code: "RTGL-CHECK-SCHEMA-001",
        severity: "error",
        filePath: schemaPath,
        message: `${model.componentKey}: schema must be a YAML object.`,
      });
      return;
    }

    const componentName = schema.componentName;
    const normalizedComponentName = typeof componentName === "string" ? componentName.trim() : "";

    if (typeof componentName !== "string" || normalizedComponentName === "") {
      diagnostics.push({
        code: "RTGL-CHECK-SCHEMA-002",
        severity: "error",
        filePath: schemaPath,
        line: componentNameLine,
        message: `${model.componentKey}: componentName is required.`,
      });
    } else if (componentName !== normalizedComponentName || !CUSTOM_ELEMENT_NAME_REGEX.test(componentName)) {
      diagnostics.push({
        code: "RTGL-CHECK-SCHEMA-003",
        severity: "error",
        filePath: schemaPath,
        line: componentNameLine,
        message: `${model.componentKey}: componentName '${componentName}' must be a valid custom-element tag (kebab-case with at least one '-').`,
      });
    } else {
      if (!componentNameOwners.has(componentName)) {
        componentNameOwners.set(componentName, []);
      }
      componentNameOwners.get(componentName).push({
        filePath: schemaPath,
        line: componentNameLine,
      });
    }

    if (Object.prototype.hasOwnProperty.call(schema, "attrsSchema")) {
      diagnostics.push({
        code: "RTGL-CHECK-SCHEMA-004",
        severity: "error",
        filePath: schemaPath,
        line: getYamlPathLine(schemaKeyPathLines, ["attrsSchema"]),
        message: `${model.componentKey}: attrsSchema is not supported.`,
      });
    }

    if (Object.prototype.hasOwnProperty.call(schema, "methods")) {
      const methodsSchema = schema.methods;
      if (!isObjectRecord(methodsSchema)) {
        diagnostics.push({
          code: "RTGL-CHECK-SCHEMA-005",
          severity: "error",
          filePath: schemaPath,
          line: getYamlPathLine(schemaKeyPathLines, ["methods"]),
          message: `${model.componentKey}: methods must be an object schema with a properties map.`,
        });
      } else {
        if (Object.prototype.hasOwnProperty.call(methodsSchema, "type") && methodsSchema.type !== "object") {
          diagnostics.push({
            code: "RTGL-CHECK-SCHEMA-006",
            severity: "error",
            filePath: schemaPath,
            line: getYamlPathLine(schemaKeyPathLines, ["methods", "type"]),
            message: `${model.componentKey}: methods.type must be 'object'.`,
          });
        }

        if (!isObjectRecord(methodsSchema.properties)) {
          diagnostics.push({
            code: "RTGL-CHECK-SCHEMA-007",
            severity: "error",
            filePath: schemaPath,
            line: getYamlPathLine(schemaKeyPathLines, ["methods", "properties"]),
            message: `${model.componentKey}: methods.properties must be an object keyed by method name.`,
          });
        }
      }
    }
  });

  componentNameOwners.forEach((owners, componentName) => {
    if (owners.length < 2) {
      return;
    }
    owners.forEach(({ filePath, line }) => {
      diagnostics.push({
        code: "RTGL-CHECK-SCHEMA-008",
        severity: "error",
        filePath,
        line,
        message: `Duplicate componentName '${componentName}' found in multiple schema files.`,
      });
    });
  });

  return diagnostics;
};
