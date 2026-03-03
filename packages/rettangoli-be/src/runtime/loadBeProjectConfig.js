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
};

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
  };
};

export default loadBeProjectConfig;
