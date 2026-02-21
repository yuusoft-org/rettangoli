import Ajv from 'ajv';

const defaultAjvOptions = {
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
};

const formatValidationErrors = (errors = []) => {
  return errors.map((error) => {
    const location = error.instancePath || '/';
    return `${location} ${error.message}`.trim();
  });
};

export const createSchemaCompiler = (options = {}) => {
  const ajv = new Ajv({ ...defaultAjvOptions, ...options });

  const compile = ({ schema, label }) => {
    try {
      const validator = ajv.compile(schema);
      return validator;
    } catch (error) {
      throw new Error(`Invalid JSON Schema for ${label}: ${error.message}`);
    }
  };

  return {
    compile,
    formatValidationErrors,
  };
};
