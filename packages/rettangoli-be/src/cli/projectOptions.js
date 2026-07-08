import { loadBeProjectConfig } from '../runtime/loadBeProjectConfig.js';

const normalizeDirs = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value) {
    return [value];
  }

  return [];
};

export const resolveBackendProjectOptions = (options = {}) => {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath ?? 'rettangoli.config.yaml';
  const projectConfig = options.projectConfig ?? loadBeProjectConfig({
    cwd,
    configPath,
    env: options.env ?? process.env,
  });

  return {
    ...options,
    cwd,
    configPath,
    projectConfig,
    dirs: normalizeDirs(options.dirs ?? options.dir ?? projectConfig.dirs),
    middlewareDir: options.middlewareDir ?? projectConfig.middlewareDir,
    setup: options.setup ?? options.setupPath ?? projectConfig.setup,
    outdir: options.outdir ?? projectConfig.outdir,
    migrationsDir: options.migrationsDir ?? projectConfig.migrationsDir,
    globalMiddlewareBefore: options.globalMiddlewareBefore ?? projectConfig.globalMiddleware.before,
    globalMiddlewareAfter: options.globalMiddlewareAfter ?? projectConfig.globalMiddleware.after,
  };
};
