const isFunction = (value) => typeof value === 'function';

export const resolveSingleFunctionExport = ({
  moduleObject,
  preferredName,
  label,
}) => {
  if (!moduleObject || typeof moduleObject !== 'object') {
    throw new Error(`Invalid module for ${label}.`);
  }

  if (preferredName && isFunction(moduleObject[preferredName])) {
    return moduleObject[preferredName];
  }

  const functionEntries = Object.entries(moduleObject).filter(([, value]) => isFunction(value));

  if (functionEntries.length === 1) {
    return functionEntries[0][1];
  }

  if (functionEntries.length === 0) {
    throw new Error(`No function export found for ${label}.`);
  }

  const exportNames = functionEntries.map(([name]) => name).join(', ');
  throw new Error(`Multiple function exports found for ${label}: ${exportNames}. Use a single export.`);
};
