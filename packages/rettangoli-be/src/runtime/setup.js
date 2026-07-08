const hasOwn = (object, key) => {
  return !!object && Object.prototype.hasOwnProperty.call(object, key);
};

export const resolveSetupExport = (setupModule) => {
  if (hasOwn(setupModule, 'setup')) {
    return setupModule.setup;
  }

  if (hasOwn(setupModule, 'createSetup')) {
    return setupModule.createSetup;
  }

  if (hasOwn(setupModule, 'default')) {
    return setupModule.default;
  }

  return undefined;
};

export const resolveSetupValue = async (setupExport, {
  cwd = process.cwd(),
  env = process.env,
  mode = 'runtime',
} = {}) => {
  if (typeof setupExport === 'function') {
    return setupExport({ cwd, env, mode });
  }

  return setupExport;
};
