import path from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { stringifyStableJson } from './json.js';
import { createMethodScaffoldPlan } from './scaffold.js';
import { normalizeContractDirs } from './contracts.js';
import { createCliResult } from './results.js';

const hashContent = (content) => {
  const hash = createHash('sha256');
  hash.update(content);
  return `sha256:${hash.digest('hex')}`;
};

const toPosixRelativePath = (cwd, filePath) => {
  return path.relative(cwd, filePath).replaceAll(path.sep, '/');
};

const createTarget = ({ cwd, filePath, kind, content }) => ({
  kind,
  path: toPosixRelativePath(cwd, filePath),
  absolutePath: filePath,
  operation: existsSync(filePath) ? 'conflict' : 'create',
  hash: hashContent(content),
  bytes: Buffer.byteLength(content),
  content,
});

const stripContent = (target) => {
  const { content, ...publicTarget } = target;
  return publicTarget;
};

const createPackageJson = () => `${JSON.stringify({
  type: 'module',
  scripts: {
    'be:check': 'rtgl be check',
    'be:verify': 'rtgl be verify --json',
    test: 'vitest run --config vitest.config.js',
  },
  dependencies: {
    '@rettangoli/be': '^1.1.0',
  },
  devDependencies: {
    vitest: '^4.0.15',
  },
}, null, 2)}\n`;

const createConfigYaml = ({ dirs }) => [
  'be:',
  '  dirs:',
  ...dirs.map((dir) => `    - ${dir}`),
  '  middlewareDir: ./src/middleware',
  '  setup: ./src/setup.js',
  '  outdir: ./.rtgl-be/generated',
  '  migrationsDir: ./migrations',
  '',
].join('\n');

const createVitestConfig = () => [
  "import { defineConfig } from 'vitest/config';",
  "import { rettangoliExamplesPlugin } from '@rettangoli/be/testing';",
  '',
  'export default defineConfig({',
  '  plugins: [rettangoliExamplesPlugin()],',
  '});',
  '',
].join('\n');

const createSetup = ({ domain }) => [
  'export const setup = {',
  '  deps: {',
  `    ${domain}: {},`,
  '  },',
  '};',
  '',
].join('\n');

const createVerifyArgv = ({ dirs }) => {
  const argv = ['rtgl', 'be', 'verify'];
  if (!(dirs.length === 1 && dirs[0] === './src/modules')) {
    dirs.forEach((dir) => argv.push('--dir', dir));
  }
  argv.push('--json');
  return argv;
};

export const createBackendInitPlan = ({
  cwd = process.cwd(),
  method = 'health.ping',
  dirs = ['./src/modules'],
} = {}) => {
  const methodDirs = normalizeContractDirs(dirs);
  if (methodDirs.length !== 1) {
    throw new Error('Backend init requires exactly one method directory.');
  }

  const domain = method.split('.')[0];
  const baseTargets = [
    createTarget({
      cwd,
      filePath: path.join(cwd, 'package.json'),
      kind: 'package',
      content: createPackageJson(),
    }),
    createTarget({
      cwd,
      filePath: path.join(cwd, 'rettangoli.config.yaml'),
      kind: 'config',
      content: createConfigYaml({ dirs: methodDirs }),
    }),
    createTarget({
      cwd,
      filePath: path.join(cwd, 'vitest.config.js'),
      kind: 'test-config',
      content: createVitestConfig(),
    }),
    createTarget({
      cwd,
      filePath: path.join(cwd, 'src', 'setup.js'),
      kind: 'setup',
      content: createSetup({ domain }),
    }),
    createTarget({
      cwd,
      filePath: path.join(cwd, 'migrations', '.gitkeep'),
      kind: 'migrations',
      content: '',
    }),
  ];
  const methodPlan = createMethodScaffoldPlan({
    cwd,
    method,
    dirs: methodDirs,
  });
  const targets = [
    ...baseTargets,
    ...methodPlan._private.targets,
  ];
  const conflicts = targets
    .filter((target) => target.operation === 'conflict')
    .map((target) => target.path);

  return {
    schemaVersion: 'rettangoli.initPlan/v1',
    ok: conflicts.length === 0,
    method,
    dirs: methodDirs,
    conflicts,
    targets: targets.map(stripContent),
    verify: {
      argv: createVerifyArgv({ dirs: methodDirs }),
    },
    _private: {
      targets,
    },
  };
};

export const applyBackendInitPlan = (plan) => {
  if (!plan.ok) {
    throw new Error(`Init has conflicts: ${plan.conflicts.join(', ')}`);
  }

  plan._private.targets.forEach((target) => {
    mkdirSync(path.dirname(target.absolutePath), { recursive: true });
    writeFileSync(target.absolutePath, target.content);
  });

  return plan;
};

const initRettangoliBackend = (options = {}) => {
  const method = options.method || 'health.ping';
  const dirs = options.dir || options.dirs || ['./src/modules'];
  const dryRun = options.dryRun || options.check;
  const outputFormat = options.format === 'json' || options.json ? 'json' : 'text';
  let plan;

  try {
    plan = createBackendInitPlan({
      ...options,
      method,
      dirs,
    });

    if (!dryRun && plan.ok) {
      applyBackendInitPlan(plan);
    }
  } catch (error) {
    const result = createCliResult({
      command: 'init',
      artifactSchemaVersion: 'rettangoli.initPlan/v1',
      ok: false,
      method,
      dirs: Array.isArray(dirs) ? dirs : [dirs],
      diagnostics: [
        {
          schemaVersion: 'rettangoli.diagnostic/v1',
          ruleId: 'RTGL-BE-INIT-001',
          code: 'RTGL-BE-INIT-001',
          severity: 'error',
          phase: 'init',
          message: error.message,
        },
      ],
    });

    if (outputFormat === 'json') {
      process.stdout.write(stringifyStableJson(result));
    } else {
      console.error(`[Init] Backend app init failed: ${error.message}`);
    }

    process.exitCode = 1;
    return result;
  }

  if (outputFormat === 'json') {
    process.stdout.write(stringifyStableJson({
      ...plan,
      _private: undefined,
    }));
  } else if (dryRun) {
    console.log(`[Init] Planned backend app with ${plan.targets.length} file(s).`);
  } else if (!plan.ok) {
    console.error(`[Init] Backend app init failed: ${plan.conflicts.length} conflict(s).`);
  } else {
    console.log(`[Init] Created backend app.`);
  }

  if (!plan.ok) {
    process.exitCode = 1;
  }

  return plan;
};

export default initRettangoliBackend;
