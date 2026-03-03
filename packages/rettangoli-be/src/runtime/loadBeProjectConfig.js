import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { load as loadYaml } from 'js-yaml';

const DEFAULT_BE_CONFIG = {
  host: '0.0.0.0',
  port: 8787,
  rpcPath: '/rpc',
  globalMiddleware: {
    before: [],
    after: [],
  },
  cors: undefined,
};

const DEFAULT_CORS_ALLOW_METHODS = ['POST', 'OPTIONS'];
const DEFAULT_CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization'];
const DEFAULT_CORS_MAX_AGE_SEC = 86400;

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const normalizePath = (value, key) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    throw new Error(`loadBeProjectConfig: ${key} must be a non-empty string`);
  }

  if (!normalized.startsWith('/')) {
    throw new Error(`loadBeProjectConfig: ${key} must start with "/"`);
  }

  return normalized;
};

const normalizeStringList = (value, key) => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(`loadBeProjectConfig: ${key} must be an array`);
  }

  return value.map((entry, index) => {
    if (typeof entry !== 'string' || !entry.trim()) {
      throw new Error(`loadBeProjectConfig: ${key}[${index}] must be a non-empty string`);
    }

    return entry.trim();
  });
};

const normalizeBoolean = (value, key, fallback) => {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') {
    throw new Error(`loadBeProjectConfig: ${key} must be a boolean`);
  }
  return value;
};

const normalizeOptionalInteger = (value, key, fallback) => {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`loadBeProjectConfig: ${key} must be an integer >= 0`);
  }
  return value;
};

const normalizeRequiredStringList = ({ value, key, transform = (entry) => entry }) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`loadBeProjectConfig: ${key} must be a non-empty array`);
  }

  return value.map((entry, index) => {
    if (typeof entry !== 'string' || !entry.trim()) {
      throw new Error(`loadBeProjectConfig: ${key}[${index}] must be a non-empty string`);
    }

    return transform(entry.trim());
  });
};

const normalizeOptionalStringList = ({ value, key, fallback = [], transform = (entry) => entry }) => {
  if (value === undefined) return fallback;
  if (!Array.isArray(value)) {
    throw new Error(`loadBeProjectConfig: ${key} must be an array`);
  }

  return value.map((entry, index) => {
    if (typeof entry !== 'string' || !entry.trim()) {
      throw new Error(`loadBeProjectConfig: ${key}[${index}] must be a non-empty string`);
    }

    return transform(entry.trim());
  });
};

const normalizeCorsConfig = (be) => {
  if (be.cors === undefined) return undefined;
  if (!isPlainObject(be.cors)) {
    throw new Error('loadBeProjectConfig: be.cors must be an object');
  }

  return {
    allowedOrigins: normalizeRequiredStringList({
      value: be.cors.allowedOrigins,
      key: 'be.cors.allowedOrigins',
    }),
    allowCredentials: normalizeBoolean(
      be.cors.allowCredentials,
      'be.cors.allowCredentials',
      false,
    ),
    allowMethods: normalizeOptionalStringList({
      value: be.cors.allowMethods,
      key: 'be.cors.allowMethods',
      fallback: DEFAULT_CORS_ALLOW_METHODS,
      transform: (entry) => entry.toUpperCase(),
    }),
    allowHeaders: normalizeOptionalStringList({
      value: be.cors.allowHeaders,
      key: 'be.cors.allowHeaders',
      fallback: DEFAULT_CORS_ALLOW_HEADERS,
    }),
    exposeHeaders: normalizeOptionalStringList({
      value: be.cors.exposeHeaders,
      key: 'be.cors.exposeHeaders',
      fallback: [],
    }),
    maxAgeSec: normalizeOptionalInteger(
      be.cors.maxAgeSec,
      'be.cors.maxAgeSec',
      DEFAULT_CORS_MAX_AGE_SEC,
    ),
  };
};

export const loadBeProjectConfig = ({
  cwd = process.cwd(),
  configPath = 'rettangoli.config.yaml',
  env = process.env,
} = {}) => {
  const resolvedConfigPath = path.resolve(cwd, configPath);
  if (!existsSync(resolvedConfigPath)) {
    return {
      ...DEFAULT_BE_CONFIG,
    };
  }

  const raw = readFileSync(resolvedConfigPath, 'utf8');
  const parsed = loadYaml(raw);
  const config = isPlainObject(parsed) ? parsed : {};
  const be = isPlainObject(config.be) ? config.be : {};

  const hostFromEnv = typeof env?.HOST === 'string' ? env.HOST.trim() : '';
  const host = hostFromEnv
    || (typeof be.host === 'string' && be.host.trim() ? be.host.trim() : DEFAULT_BE_CONFIG.host);

  const portFromEnv = Number.parseInt(String(env?.PORT ?? ''), 10);
  const port = Number.isInteger(portFromEnv) && portFromEnv > 0
    ? portFromEnv
    : (Number.isInteger(be.port) && be.port > 0 ? be.port : DEFAULT_BE_CONFIG.port);

  const rpcPath = be.rpcPath === undefined
    ? DEFAULT_BE_CONFIG.rpcPath
    : normalizePath(be.rpcPath, 'be.rpcPath');

  const globalMiddlewareRaw = isPlainObject(be.globalMiddleware) ? be.globalMiddleware : {};
  const globalMiddleware = {
    before: normalizeStringList(globalMiddlewareRaw.before, 'be.globalMiddleware.before'),
    after: normalizeStringList(globalMiddlewareRaw.after, 'be.globalMiddleware.after'),
  };

  return {
    host,
    port,
    rpcPath,
    globalMiddleware,
    cors: normalizeCorsConfig(be),
  };
};

export default loadBeProjectConfig;
