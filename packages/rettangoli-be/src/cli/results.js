export const CLI_RESULT_SCHEMA_VERSION = 'rettangoli.cliResult/v1';

export const createCliResult = ({
  command,
  artifactSchemaVersion,
  ...result
} = {}) => {
  return {
    schemaVersion: CLI_RESULT_SCHEMA_VERSION,
    command,
    artifactSchemaVersion,
    ...result,
  };
};
