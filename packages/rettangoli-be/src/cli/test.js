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

const toOutputTail = (value, maxLength = 4000) => {
  const text = String(value ?? '');
  return text.length > maxLength ? text.slice(-maxLength) : text;
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
  const {
    cwd = process.cwd(),
    dirs = ['./src/modules'],
    middlewareDir = './src/middleware',
    method,
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
    method,
    middlewareDir,
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
  const configPath = path.resolve(cwd, config);

  if (config && existsSync(configPath)) {
    vitestArgs.push('--config', config);
  }

  const runner = createPackageRunner({ executable, packageManager, env });
  const args = [...runner.argsPrefix, ...vitestArgs];
  const captureOutput = options.format === 'json';
  const result = runCommand(runner.executable, args, {
    cwd,
    encoding: 'utf8',
    stdio: captureOutput ? 'pipe' : 'inherit',
  });
  const exitCode = typeof result.status === 'number' ? result.status : 1;
  const ok = exitCode === 0;
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const failureDiagnostic = ok ? undefined : normalizeDiagnostic({
    cwd,
    error: {
      code: 'RTGL-BE-TEST-002',
      message: `Backend examples failed with exit code ${exitCode}.`,
      filePath: files.length === 1 ? files[0] : undefined,
    },
    phase: 'test',
    method,
    command: testCommand,
    extra: {
      files,
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
    phase: 'test',
    commands,
    files,
    command: {
      executable: runner.executable,
      args,
      argv: [runner.executable, ...args],
    },
    exitCode,
    diagnostics,
    nextAction: createNextAction({
      ok,
      failedPhase: ok ? undefined : 'test',
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
