const requireString = (value, key) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`createConfig: ${key} is required`);
  }

  return value;
};

export const createConfig = ({ env }) => {
  if (!env) throw new Error('createConfig: env is required');

  return Object.freeze({
    nodeEnv: env.NODE_ENV || 'development',
    logLevel: env.LOG_LEVEL || 'info',
    dbUrl: requireString(env.DB_URL || 'memory://example', 'DB_URL'),
  });
};
