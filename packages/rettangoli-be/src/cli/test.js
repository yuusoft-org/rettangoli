import path from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { analyzeBackendContracts } from './contractScope.js';
import {
  createBackendCommands,
  createNextAction,
  createScope,
  findCommand,
  normalizeDiagnostic,
  normalizeDiagnostics,
  toPosixRelativePath,
} from './agentLoop.js';
import { stringifyStableJson } from './json.js';
import { createCliResult } from './results.js';
import { resolveBackendProjectOptions } from './projectOptions.js';

const toOutputTail = (value, maxLength = 4000) => {
  const text = String(value ?? '');
  return text.length > maxLength ? text.slice(-maxLength) : text;
};

const toProcessOutputText = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  return String(value);
};

const inferAppFailureFromOutput = ({ cwd, output, method, setup }) => {
  const runtimeContractMatch = output.match(/\b(RTGL-BE-CONTRACT-\d{3})\s+(.+?)\s+\[([^\]]+)\]/);
  if (runtimeContractMatch) {
    const [, code, message, filePath] = runtimeContractMatch;
    return {
      code,
      method,
      message: `Runtime contract validation failed: ${message}`,
      filePath,
    };
  }

  const setupPath = path.resolve(cwd, setup);
  const missingDomainMatch = output.match(/createApp: missing setup\.deps\.([A-Za-z0-9_]+) object required by method '([^']+)'/);
  if (missingDomainMatch) {
    const [, domain, failedMethod] = missingDomainMatch;
    return {
      code: 'RTGL-BE-APP-006',
      method: failedMethod || method,
      message: `Missing setup.deps.${domain} object required by method '${failedMethod || method}'.`,
      filePath: setupPath,
    };
  }

  if (output.includes('createApp: setup.deps object is required')) {
    return {
      code: 'RTGL-BE-APP-005',
      method,
      message: 'Setup export must include setup.deps object.',
      filePath: setupPath,
    };
  }

  if (output.includes('createAppFromProject: setup export not found')) {
    return {
      code: 'RTGL-BE-APP-003',
      method,
      message: 'Setup file must export setup or default.',
      filePath: setupPath,
    };
  }

  return undefined;
};

const createRunnerFailure = ({ result, runner, args }) => {
  if (!result.error) {
    return undefined;
  }

  return {
    code: 'RTGL-BE-RUNNER-001',
    message: `Backend example runner failed: ${result.error.message}`,
    runner: {
      executable: runner.executable,
      args,
      argv: [runner.executable, ...args],
      status: result.status,
      signal: result.signal,
      errorCode: result.error.code,
    },
  };
};

const createPackageRunner = ({ executable, packageManager, env = process.env } = {}) => {
  if (executable) {
    return {
      executable,
      argsPrefix: [],
    };
  }

  const userAgent = String(env.npm_config_user_agent || '').toLowerCase();
  const execPath = String(env.npm_execpath || '').toLowerCase();
  const manager = packageManager
    || (userAgent.includes('bun') || execPath.includes('bun') ? 'bun' : undefined)
    || (userAgent.includes('pnpm') || execPath.includes('pnpm') ? 'pnpm' : undefined)
    || (userAgent.includes('yarn') || execPath.includes('yarn') ? 'yarn' : undefined)
    || 'npm';

  if (manager === 'bun') {
    return { executable: 'bunx', argsPrefix: [] };
  }

  if (manager === 'pnpm') {
    return { executable: 'pnpm', argsPrefix: ['exec'] };
  }

  if (manager === 'yarn') {
    return { executable: 'yarn', argsPrefix: [] };
  }

  return { executable: 'npm', argsPrefix: ['exec', '--'] };
};

export const runBackendTests = (options = {}) => {
  options = resolveBackendProjectOptions(options);
  const {
    cwd = process.cwd(),
    dirs = ['./src/modules'],
    middlewareDir = './src/middleware',
    method,
    setup = './src/setup.js',
    configPath,
    globalMiddleware = [],
    globalMiddlewareBefore = [],
    globalMiddlewareAfter = [],
    config = './vitest.config.js',
    reporter = 'verbose',
    runCommand = spawnSync,
    executable,
    packageManager,
    env = process.env,
    includeOutput = true,
  } = options;

  const analysis = analyzeBackendContracts({
    cwd,
    dirs,
    middlewareDir,
    method,
  });
  const methods = method
    ? analysis.contracts.map((contract) => contract.method)
    : analysis.allContracts.map((contract) => contract.method);
  const scope = createScope({ method, methods });
  const commands = createBackendCommands({
    dirs,
    method,
    middlewareDir,
    setup,
    configPath,
    globalMiddleware,
    globalMiddlewareBefore,
    globalMiddlewareAfter,
    config,
    executable,
    packageManager,
  });
  const testCommand = findCommand(commands, 'test');

  if (!analysis.ok) {
    const diagnostics = normalizeDiagnostics({
      cwd,
      errors: analysis.errors,
      phase: 'contracts',
      method,
      command: findCommand(commands, 'check'),
    });

    return createCliResult({
      command: 'test',
      artifactSchemaVersion: 'rettangoli.test/v1',
      ok: false,
      prefix: '[Test]',
      method,
      scope,
      phase: 'contracts',
      commands,
      summary: analysis.summary,
      errors: analysis.errors,
      diagnostics,
      nextAction: createNextAction({
        ok: false,
        failedPhase: 'contracts',
        diagnostics,
        commands,
      }),
    });
  }

  const files = analysis.contracts.map((contract) => toPosixRelativePath(cwd, contract.examplesPath));
  const relatedFiles = [...new Set(
    analysis.contracts.flatMap((contract) => [
      contract.examplesPath,
      contract.contractPath,
      contract.handlerPath,
    ].map((filePath) => toPosixRelativePath(cwd, filePath))),
  )].filter(Boolean).sort();
  if (files.length === 0) {
    const error = {
      code: 'RTGL-BE-TEST-001',
      message: method
        ? `No backend examples found for method '${method}'.`
        : 'No backend examples found to test.',
    };
    const diagnostics = [
      normalizeDiagnostic({
        cwd,
        error,
        phase: 'examples',
        method,
        command: testCommand,
      }),
    ];

    return createCliResult({
      command: 'test',
      artifactSchemaVersion: 'rettangoli.test/v1',
      ok: false,
      prefix: '[Test]',
      method,
      scope,
      phase: 'examples',
      commands,
      files,
      error,
      diagnostics,
      nextAction: createNextAction({
        ok: false,
        failedPhase: 'examples',
        diagnostics,
        commands,
      }),
    });
  }

  const vitestArgs = ['vitest', 'run', ...files, '--reporter', reporter];
  const resolvedTestConfigPath = path.resolve(cwd, config);

  if (config && !existsSync(resolvedTestConfigPath)) {
    const diagnostic = normalizeDiagnostic({
      cwd,
      error: {
        code: 'RTGL-BE-TEST-003',
        message: `Vitest config not found: ${config}`,
        filePath: config,
      },
      phase: 'test',
      method,
      command: testCommand,
      extra: {
        files: relatedFiles,
      },
    });

    return createCliResult({
      command: 'test',
      artifactSchemaVersion: 'rettangoli.test/v1',
      ok: false,
      prefix: '[Test]',
      method,
      scope,
      phase: 'test',
      commands,
      files,
      config,
      diagnostics: [diagnostic],
      nextAction: createNextAction({
        ok: false,
        failedPhase: 'test',
        diagnostics: [diagnostic],
        commands,
      }),
    });
  }

  if (config) {
    vitestArgs.push('--config', config);
  }

  const runner = createPackageRunner({ executable, packageManager, env });
  const args = [...runner.argsPrefix, ...vitestArgs];
  const captureOutput = options.format === 'json';
  const childEnv = {
    ...process.env,
    ...env,
    RTGL_BE_EXAMPLES_RUNTIME: JSON.stringify({
      cwd,
      method,
      methodDirs: dirs,
      middlewareDirs: [middlewareDir],
      setupPath: setup,
      globalMiddleware,
      globalMiddlewareBefore,
      globalMiddlewareAfter,
    }),
  };
  const result = runCommand(runner.executable, args, {
    cwd,
    env: childEnv,
    encoding: 'utf8',
    stdio: captureOutput ? 'pipe' : 'inherit',
  }) ?? {
    status: 1,
    stdout: '',
    stderr: '',
    error: new Error('Backend example runner did not return a process result.'),
  };
  const runnerFailure = createRunnerFailure({ result, runner, args });
  const exitCode = runnerFailure
    ? (typeof result.status === 'number' && result.status !== 0 ? result.status : 1)
    : (typeof result.status === 'number' ? result.status : 1);
  const ok = !runnerFailure && exitCode === 0;
  const stdout = toProcessOutputText(result.stdout ?? result.output?.[1]);
  const stderr = [
    toProcessOutputText(result.stderr ?? result.output?.[2]),
    result.error?.message,
  ].filter(Boolean).join('\n');
  const outputText = [stdout, stderr].filter(Boolean).join('\n');
  const appFailure = ok ? undefined : inferAppFailureFromOutput({
    cwd,
    output: outputText,
    method,
    setup,
  });
  const failureError = runnerFailure ?? appFailure ?? {
    code: 'RTGL-BE-TEST-002',
    message: result.error?.message
      ? `Backend examples failed with exit code ${exitCode}: ${result.error.message}`
      : `Backend examples failed with exit code ${exitCode}.`,
    filePath: files.length === 1 ? files[0] : undefined,
  };
  const failurePhase = runnerFailure ? 'runner' : appFailure ? 'app' : 'test';
  const failureCommand = runnerFailure ? testCommand : appFailure ? findCommand(commands, 'app') : testCommand;
  const failureDiagnostic = ok ? undefined : normalizeDiagnostic({
    cwd,
    error: failureError,
    phase: failurePhase,
    method,
    command: failureCommand,
    extra: {
      files: runnerFailure ? [] : relatedFiles,
      executedFiles: runnerFailure ? [] : files,
      runner: runnerFailure?.runner,
      outputTail: {
        stdout: toOutputTail(stdout),
        stderr: toOutputTail(stderr),
      },
    },
  });
  const diagnostics = failureDiagnostic ? [failureDiagnostic] : [];

  return createCliResult({
    command: 'test',
    artifactSchemaVersion: 'rettangoli.test/v1',
    ok,
    prefix: '[Test]',
    method,
    scope,
    phase: ok ? 'test' : failurePhase,
    commands,
    files,
    runner: {
      executable: runner.executable,
      args,
      argv: [runner.executable, ...args],
    },
    exitCode,
    diagnostics,
    nextAction: createNextAction({
      ok,
      failedPhase: ok ? undefined : failurePhase,
      diagnostics,
      commands,
    }),
    stdout: captureOutput && includeOutput ? stdout : undefined,
    stderr: captureOutput && includeOutput ? stderr : undefined,
  });
};

const testRettangoliBackend = (options = {}) => {
  const outputFormat = options.format === 'json' ? 'json' : 'text';
  const result = runBackendTests({
    ...options,
    format: outputFormat,
  });

  if (outputFormat === 'json') {
    process.stdout.write(stringifyStableJson(result));
  } else if (result.ok) {
    const suffix = result.method ? ` for ${result.method}` : '';
    console.log(`[Test] Backend examples passed${suffix}.`);
  } else if (result.phase === 'contracts') {
    console.error(`Backend contract validation failed before tests: ${result.summary.total} issue(s)`);
  } else if (result.phase === 'examples') {
    console.error(`[Test] ${result.error?.message ?? 'No backend examples found to test.'}`);
  } else {
    console.error(`[Test] Backend examples failed with exit code ${result.exitCode ?? 1}.`);
  }

  if (!result.ok) {
    process.exitCode = 1;
  }

  return result;
};

export default testRettangoliBackend;
