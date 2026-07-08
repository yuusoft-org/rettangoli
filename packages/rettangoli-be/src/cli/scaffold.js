import path from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { stringifyStableJson } from './json.js';
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

const toPascal = (value) => {
  return String(value)
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');
};

const toCamel = (value) => {
  const pascal = toPascal(value);
  return `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}`;
};

const METHOD_ID_SEGMENT_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

const parseMethodId = (methodId) => {
  const parts = String(methodId || '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Method id must use <domain>.<action>: ${methodId || '<missing>'}`);
  }

  parts.forEach((part) => {
    if (!METHOD_ID_SEGMENT_PATTERN.test(part)) {
      throw new Error(
        `Method id segment '${part}' is invalid. Use letters, numbers, and underscores, starting with a letter.`,
      );
    }
  });

  return {
    domain: parts[0],
    action: parts[1],
    method: `${parts[0]}.${parts[1]}`,
  };
};

const createContractContent = ({ domain, action, method }) => [
  `id: ${method}`,
  'params:',
  '  schema:',
  '    type: object',
  '    additionalProperties: false',
  '    properties: {}',
  '    required: []',
  'result:',
  '  schema:',
  '    type: object',
  '    additionalProperties: false',
  '    properties:',
  '      ok:',
  '        type: boolean',
  '    required: [ok]',
  '',
].join('\n');

const createExamplesContent = () => [
  'case: ok',
  'request:',
  '  id: ok',
  '  params: {}',
  'out:',
  '  result:',
  '    ok: true',
  '',
].join('\n');

const createHandlerContent = ({ exportName }) => [
  `export const ${exportName} = () => ({`,
  '  ok: true,',
  '});',
  '',
].join('\n');

const createScaffoldTarget = ({ cwd, filePath, kind, content }) => ({
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

const createVerifyArgv = ({ method, dirs }) => {
  const argv = ['rtgl', 'be', 'verify'];
  if (!(dirs.length === 1 && dirs[0] === './src/modules')) {
    dirs.forEach((dir) => {
      argv.push('--dir', dir);
    });
  }
  argv.push('--method', method, '--json');
  return argv;
};

export const createMethodScaffoldPlan = ({
  cwd = process.cwd(),
  method,
  methodId = method,
  dirs = './src/modules',
} = {}) => {
  const parsed = parseMethodId(methodId);
  const methodDirs = normalizeContractDirs(dirs);
  if (methodDirs.length !== 1) {
    throw new Error('Method scaffold requires exactly one method directory.');
  }

  const modulesDir = path.resolve(cwd, methodDirs[0]);
  const methodDir = path.join(modulesDir, parsed.domain, parsed.action);
  const exportName = `${toCamel(parsed.domain)}${toPascal(parsed.action)}Method`;
  const targets = [
    createScaffoldTarget({
      cwd,
      filePath: path.join(methodDir, `${parsed.action}.contract.yaml`),
      kind: 'contract',
      content: createContractContent(parsed),
    }),
    createScaffoldTarget({
      cwd,
      filePath: path.join(methodDir, `${parsed.action}.examples.yaml`),
      kind: 'examples',
      content: createExamplesContent(),
    }),
    createScaffoldTarget({
      cwd,
      filePath: path.join(methodDir, `${parsed.action}.handlers.js`),
      kind: 'handler',
      content: createHandlerContent({ exportName }),
    }),
  ];
  const conflicts = targets
    .filter((target) => target.operation === 'conflict')
    .map((target) => target.path);

  return {
    schemaVersion: 'rettangoli.scaffoldPlan/v1',
    ok: conflicts.length === 0,
    method: parsed.method,
    methodFolder: toPosixRelativePath(cwd, methodDir),
    exportName,
    conflicts,
    targets: targets.map(stripContent),
    setupRequirement: {
      path: 'src/setup.js',
      dependencyPath: `setup.deps.${parsed.domain}`,
      message: `Ensure setup.deps.${parsed.domain} exists before importing the generated app.`,
    },
    verify: {
      argv: createVerifyArgv({ method: parsed.method, dirs: methodDirs }),
    },
    _private: {
      targets,
    },
  };
};

export const applyMethodScaffoldPlan = (plan) => {
  if (!plan.ok) {
    throw new Error(`Scaffold has conflicts: ${plan.conflicts.join(', ')}`);
  }

  plan._private.targets.forEach((target) => {
    mkdirSync(path.dirname(target.absolutePath), { recursive: true });
    writeFileSync(target.absolutePath, target.content);
  });

  return plan;
};

const scaffoldRettangoliBackend = (options = {}) => {
  const dryRun = options.dryRun || options.check;
  const outputFormat = options.format === 'json' || options.json ? 'json' : 'text';
  let plan;

  try {
    plan = createMethodScaffoldPlan(options);

    if (!dryRun && plan.ok) {
      applyMethodScaffoldPlan(plan);
    }
  } catch (error) {
    const result = createCliResult({
      command: 'scaffold',
      artifactSchemaVersion: 'rettangoli.scaffoldPlan/v1',
      ok: false,
      method: options.method ?? options.methodId,
      diagnostics: [
        {
          schemaVersion: 'rettangoli.diagnostic/v1',
          ruleId: 'RTGL-BE-SCAFFOLD-001',
          code: 'RTGL-BE-SCAFFOLD-001',
          severity: 'error',
          phase: 'scaffold',
          message: error.message,
        },
      ],
    });

    if (outputFormat === 'json') {
      process.stdout.write(stringifyStableJson(result));
    } else {
      console.error(`[Scaffold] Method scaffold failed: ${error.message}`);
    }

    process.exitCode = 1;
    return result;
  }

  if (outputFormat === 'json') {
    process.stdout.write(stringifyStableJson({
      ...plan,
      _private: undefined,
    }));
  } else if (!plan.ok) {
    const action = dryRun ? 'plan' : 'create';
    console.error(`[Scaffold] Failed to ${action} method package for ${plan.method}: ${plan.conflicts.length} conflict(s).`);
  } else if (dryRun) {
    console.log(`[Scaffold] Planned method package for ${plan.method}.`);
  } else {
    console.log(`[Scaffold] Created method package for ${plan.method}.`);
  }

  if (!plan.ok) {
    process.exitCode = 1;
  }

  return plan;
};

export default scaffoldRettangoliBackend;
