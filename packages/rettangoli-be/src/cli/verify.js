import { createHash } from 'node:crypto';
import build from './build.js';
import { runBackendCheck } from './check.js';
import {
  createBackendManifest,
  stringifyStableJson,
} from './manifest.js';
import { runBackendTests } from './test.js';
import {
  collectSourceFilesFromManifest,
  createBackendCommands,
  createNextAction,
  createScope,
  findCommand,
  normalizeDiagnostic,
} from './agentLoop.js';

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

const createSteps = ({ check, buildResult, manifestResult, test }) => {
  return [
    { id: 'check', ok: check.ok },
    { id: 'build', ok: buildResult?.ok === true, skipped: buildResult === undefined },
    { id: 'manifest', ok: manifestResult?.ok === true, skipped: manifestResult === undefined },
    { id: 'test', ok: test?.ok === true, skipped: test === undefined },
  ];
};

const findFailedPhase = ({ steps, test }) => {
  const failedStep = steps.find((step) => !step.skipped && !step.ok);
  if (failedStep?.id === 'test' && test?.phase && test.phase !== 'contracts') {
    return test.phase;
  }
  return failedStep?.id;
};

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
  const commands = createBackendCommands({
    method,
    middlewareDir,
    setup,
    outdir,
    testConfig,
    executable,
    packageManager,
  });
  const check = runBackendCheck(sharedOptions);
  const checkMethods = method
    ? check.scope.methods
    : check.scope.methods;

  if (!check.ok) {
    const steps = createSteps({ check });
    const failedPhase = findFailedPhase({ steps });
    const diagnostics = check.diagnostics ?? [];
    const ok = false;

    return {
      schemaVersion: 'rettangoli.verify/v1',
      ok,
      scope: createScope({ method, methods: checkMethods }),
      method,
      failedPhase,
      steps,
      commands,
      files: {
        owned: [...new Set(diagnostics.map((diagnostic) => diagnostic.filePath).filter(Boolean))].sort(),
        write: [],
      },
      diagnostics,
      nextAction: createNextAction({
        ok,
        failedPhase,
        diagnostics,
        commands,
        final: true,
      }),
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
  let manifestValue;
  try {
    manifestValue = createBackendManifest({
      cwd,
      dirs,
      middlewareDir,
      method,
    });
    const scopeHash = hashJson(manifestValue);
    manifestResult = {
      ok: true,
      hash: scopeHash,
      scopeHash,
      methodCount: Object.keys(manifestValue.methods).length,
      methods: Object.keys(manifestValue.methods).sort(),
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
  const steps = createSteps({ check, buildResult, manifestResult, test });
  const failedPhase = findFailedPhase({ steps, test });
  const diagnostics = [
    ...(check.diagnostics ?? []),
    ...(buildResult.ok ? [] : [
      normalizeDiagnostic({
        cwd,
        error: {
          code: 'RTGL-BE-BUILD-001',
          message: buildResult.error?.message ?? 'Backend build failed.',
        },
        phase: 'build',
        method,
        command: findCommand(commands, 'verify'),
      }),
    ]),
    ...(manifestResult.ok ? [] : [
      normalizeDiagnostic({
        cwd,
        error: {
          code: 'RTGL-BE-MANIFEST-001',
          message: manifestResult.error?.message ?? 'Backend manifest failed.',
        },
        phase: 'manifest',
        method,
        command: findCommand(commands, 'manifest'),
      }),
    ]),
    ...(test.diagnostics ?? []),
  ];
  const ok = check.ok && buildResult.ok && manifestResult.ok && test.ok;
  const ownedFiles = manifestValue
    ? collectSourceFilesFromManifest(manifestValue)
    : [...new Set(diagnostics.map((diagnostic) => diagnostic.filePath).filter(Boolean))].sort();
  const writeFiles = method
    ? []
    : [
      buildResult.registryPath,
      buildResult.appEntryPath,
    ].filter(Boolean);

  return {
    schemaVersion: 'rettangoli.verify/v1',
    ok,
    scope: createScope({ method, methods: manifestResult.methods ?? checkMethods }),
    method,
    failedPhase,
    steps,
    commands,
    files: {
      owned: ownedFiles,
      write: writeFiles,
    },
    diagnostics,
    nextAction: createNextAction({
      ok,
      failedPhase,
      diagnostics,
      commands,
      final: true,
    }),
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
