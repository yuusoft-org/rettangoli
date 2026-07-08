import { createHash } from 'node:crypto';
import build from './build.js';
import { runBackendCheck } from './check.js';
import {
  createBackendManifest,
} from './manifest.js';
import { stringifyStableJson } from './json.js';
import { runBackendTests } from './test.js';
import { createCliResult } from './results.js';
import { writeBackendVerifyEvidence } from './agentWorkflow.js';
import { runBackendDbCheck } from './db.js';
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

const createSkippedDbCheck = ({ method, migrationsDir }) => createCliResult({
  command: 'db check',
  artifactSchemaVersion: 'rettangoli.dbCheck/v1',
  ok: true,
  skipped: true,
  reason: 'method-scoped verify does not prove project-wide SQLite migrations',
  scope: {
    type: 'method',
    methods: [method],
    provesProject: false,
  },
  method,
  migrationsDir,
  replay: {
    ok: true,
    skipped: true,
  },
  diagnostics: [],
});

const createSteps = ({ check, buildResult, manifestResult, db, test }) => {
  return [
    { id: 'check', ok: check.ok },
    { id: 'build', ok: buildResult?.ok === true, skipped: buildResult === undefined },
    { id: 'manifest', ok: manifestResult?.ok === true, skipped: manifestResult === undefined },
    { id: 'db', ok: db?.ok === true, skipped: db === undefined || db.skipped === true },
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
    evidence,
    taskId = evidence,
    migrationsDir = './migrations',
  } = options;

  const sharedOptions = {
    cwd,
    dirs,
    middlewareDir,
    method,
  };
  const commands = createBackendCommands({
    dirs,
    method,
    middlewareDir,
    setup,
    outdir,
    migrationsDir,
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

    let result = createCliResult({
      command: 'verify',
      artifactSchemaVersion: 'rettangoli.verify/v1',
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
      db: undefined,
      test: undefined,
    });

    const evidenceResult = writeBackendVerifyEvidence({
      cwd,
      taskId,
      result,
    });
    if (evidenceResult) {
      result = evidenceResult.result;
    }

    return result;
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
        dryRun: true,
        silent: true,
      });
      buildResult = {
        ok: true,
        scope: 'project',
        generated: false,
        dryRun: true,
        plan: {
          schemaVersion: output.schemaVersion,
          outdir: output.outdir,
          targets: output.targets,
        },
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
      outdir,
      migrationsDir,
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

  const db = method
    ? createSkippedDbCheck({ method, migrationsDir })
    : runBackendDbCheck({
        cwd,
        migrationsDir,
      });

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
  const steps = createSteps({ check, buildResult, manifestResult, db, test });
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
    ...(db.diagnostics ?? []),
    ...(test.diagnostics ?? []),
  ];
  const ok = check.ok && buildResult.ok && manifestResult.ok && db.ok && test.ok;
  const diagnosticFiles = diagnostics
    .map((diagnostic) => diagnostic.filePath)
    .filter(Boolean);
  const ownedFiles = [
    ...(manifestValue ? collectSourceFilesFromManifest(manifestValue) : []),
    ...diagnosticFiles,
  ].filter(Boolean);
  const writeFiles = method
    ? []
    : (buildResult.plan?.targets ?? [])
      .map((target) => target.path)
      .filter(Boolean);

  let result = createCliResult({
    command: 'verify',
    artifactSchemaVersion: 'rettangoli.verify/v1',
    ok,
    scope: createScope({ method, methods: manifestResult.methods ?? checkMethods }),
    method,
    failedPhase,
    steps,
    commands,
    files: {
      owned: [...new Set(ownedFiles)].sort(),
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
    db,
    test,
  });

  const evidenceResult = writeBackendVerifyEvidence({
    cwd,
    taskId,
    result,
    manifest: manifestValue,
  });
  if (evidenceResult) {
    result = evidenceResult.result;
  }

  return result;
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
