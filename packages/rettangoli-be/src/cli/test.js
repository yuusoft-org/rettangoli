import path from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { analyzeBackendContracts } from './contractScope.js';

const toPosixRelativePath = (cwd, filePath) => {
  return path.relative(cwd, filePath).replaceAll(path.sep, '/');
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

  if (!analysis.ok) {
    return {
      ok: false,
      prefix: '[Test]',
      method,
      phase: 'contracts',
      summary: analysis.summary,
      errors: analysis.errors,
    };
  }

  const files = analysis.contracts.map((contract) => toPosixRelativePath(cwd, contract.examplesPath));
  if (files.length === 0) {
    return {
      ok: false,
      prefix: '[Test]',
      method,
      phase: 'examples',
      files,
      error: {
        code: 'RTGL-BE-TEST-001',
        message: method
          ? `No backend examples found for method '${method}'.`
          : 'No backend examples found to test.',
      },
    };
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

  return {
    ok: exitCode === 0,
    prefix: '[Test]',
    method,
    phase: 'test',
    files,
    command: {
      executable: runner.executable,
      args,
    },
    exitCode,
    stdout: captureOutput && includeOutput ? result.stdout ?? '' : undefined,
    stderr: captureOutput && includeOutput ? result.stderr ?? '' : undefined,
  };
};

const testRettangoliBackend = (options = {}) => {
  const outputFormat = options.format === 'json' ? 'json' : 'text';
  const result = runBackendTests({
    ...options,
    format: outputFormat,
  });

  if (outputFormat === 'json') {
    console.log(JSON.stringify(result, null, 2));
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
