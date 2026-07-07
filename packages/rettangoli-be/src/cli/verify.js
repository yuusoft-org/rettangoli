import { createHash } from 'node:crypto';
import build from './build.js';
import { runBackendCheck } from './check.js';
import {
  createBackendManifest,
  stringifyStableJson,
} from './manifest.js';
import { runBackendTests } from './test.js';

const hashJson = (value) => {
  const hash = createHash('sha256');
  hash.update(stringifyStableJson(value));
  return `sha256:${hash.digest('hex')}`;
};

const createStepFailure = (name, error) => ({
  ok: false,
  name,
  error: {
    message: error.message,
  },
});

export const runBackendVerify = (options = {}) => {
  const {
    cwd = process.cwd(),
    dirs = ['./src/modules'],
    middlewareDir = './src/middleware',
    method,
    setup = './src/setup.js',
    outdir = './.rtgl-be/generated',
    testConfig = './vitest.config.js',
    runCommand,
    executable,
    packageManager,
    env,
  } = options;

  const sharedOptions = {
    cwd,
    dirs,
    middlewareDir,
    method,
  };
  const check = runBackendCheck(sharedOptions);

  if (!check.ok) {
    return {
      schemaVersion: 'rettangoli.verify/v1',
      ok: false,
      method,
      check,
      build: undefined,
      manifest: undefined,
      test: undefined,
    };
  }

  let buildResult;
  try {
    if (method) {
      buildResult = {
        ok: true,
        scope: 'method',
        method,
        generated: false,
        methodCount: check.methodCount,
      };
    } else {
      const output = build({
        cwd,
        dirs,
        middlewareDir,
        setup,
        outdir,
        silent: true,
      });
      buildResult = {
        ok: true,
        scope: 'project',
        registryPath: output.registryPath,
        appEntryPath: output.appEntryPath,
        methodCount: output.methodCount,
      };
    }
  } catch (error) {
    buildResult = createStepFailure('build', error);
  }

  let manifestResult;
  try {
    const value = createBackendManifest({
      cwd,
      dirs,
      middlewareDir,
      method,
    });
    manifestResult = {
      ok: true,
      hash: hashJson(value),
      methodCount: Object.keys(value.methods).length,
      methods: Object.keys(value.methods).sort(),
    };
  } catch (error) {
    manifestResult = createStepFailure('manifest', error);
  }

  const test = runBackendTests({
    ...sharedOptions,
    config: testConfig,
    format: 'json',
    includeOutput: false,
    runCommand,
    executable,
    packageManager,
    env,
  });

  return {
    schemaVersion: 'rettangoli.verify/v1',
    ok: check.ok && buildResult.ok && manifestResult.ok && test.ok,
    method,
    check,
    build: buildResult,
    manifest: manifestResult,
    test,
  };
};

const verifyRettangoliBackend = (options = {}) => {
  const outputFormat = options.format === 'json' ? 'json' : 'text';
  const result = runBackendVerify(options);

  if (outputFormat === 'json') {
    process.stdout.write(stringifyStableJson(result));
  } else if (result.ok) {
    const suffix = result.method ? ` for ${result.method}` : '';
    console.log(`[Verify] Backend verification passed${suffix}.`);
  } else {
    const suffix = result.method ? ` for ${result.method}` : '';
    console.error(`[Verify] Backend verification failed${suffix}.`);
  }

  if (!result.ok) {
    process.exitCode = 1;
  }

  return result;
};

export default verifyRettangoliBackend;
