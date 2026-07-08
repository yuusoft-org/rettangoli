import path from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  collectResolvedMethodContracts,
  validateRpcDirs,
} from '../core/contracts/rpcFiles.js';
import { resolveContractDirs } from './contracts.js';
import { stringifyStableJson } from './json.js';

const toPosixRelativeImport = (fromFilePath, toFilePath) => {
  const relativePath = path.relative(path.dirname(fromFilePath), toFilePath).replaceAll(path.sep, '/');
  if (relativePath.startsWith('.')) {
    return relativePath;
  }
  return `./${relativePath}`;
};

const hashContent = (content) => {
  const hash = createHash('sha256');
  hash.update(content);
  return `sha256:${hash.digest('hex')}`;
};

const hashFile = (filePath) => {
  if (!existsSync(filePath)) {
    return undefined;
  }

  return hashContent(readFileSync(filePath));
};

const createGeneratedRegistryContent = ({
  outputFile,
  methods,
  middlewareEntries,
}) => {
  const lines = [];

  const handlerImports = methods.map((methodContract, index) => {
    const varName = `handlerModule${index}`;
    lines.push(`import * as ${varName} from '${toPosixRelativeImport(outputFile, methodContract.handlerPath)}';`);
    return { method: methodContract.method, varName };
  });

  const middlewareImports = middlewareEntries.map((middlewareEntry, index) => {
    const varName = `middlewareModule${index}`;
    lines.push(`import * as ${varName} from '${toPosixRelativeImport(outputFile, middlewareEntry.filePath)}';`);
    return { middlewareName: middlewareEntry.middlewareName, varName };
  });

  lines.push('');
  lines.push(`export const methodContracts = ${JSON.stringify(
    Object.fromEntries(methods.map((entry) => [entry.method, entry.rpc])),
    null,
    2,
  )};`);
  lines.push('');
  lines.push('export const methodHandlers = {');
  handlerImports.forEach((handlerImport) => {
    lines.push(`  '${handlerImport.method}': ${handlerImport.varName},`);
  });
  lines.push('};');
  lines.push('');
  lines.push('export const middlewareModules = {');
  middlewareImports.forEach((middlewareImport) => {
    lines.push(`  '${middlewareImport.middlewareName}': ${middlewareImport.varName},`);
  });
  lines.push('};');
  lines.push('');
  lines.push('const registry = { methodContracts, methodHandlers, middlewareModules };');
  lines.push('export default registry;');

  return `${lines.join('\n')}\n`;
};

const createGeneratedAppEntryContent = ({
  outputFile,
  setupPath,
}) => {
  const lines = [
    `import { createApp } from '@rettangoli/be';`,
    `import registry from './registry.js';`,
    `import * as setupModule from '${toPosixRelativeImport(outputFile, setupPath)}';`,
    '',
    'const setup = setupModule.setup ?? setupModule.default;',
    'if (!setup) {',
    "  throw new Error('Generated app: setup export not found. Export setup or default from setup.js');",
    '}',
    '',
    'export const app = createApp({',
    '  setup,',
    '  methodContracts: registry.methodContracts,',
    '  methodHandlers: registry.methodHandlers,',
    '  middlewareModules: registry.middlewareModules,',
    '});',
    '',
    'export default app;',
  ];

  return `${lines.join('\n')}\n`;
};

const toPosixRelativePath = (cwd, filePath) => {
  return path.relative(cwd, filePath).replaceAll(path.sep, '/');
};

const createTarget = ({ cwd, outputFile, kind, content, inputSourcePaths, methodCount }) => ({
  kind,
  path: toPosixRelativePath(cwd, outputFile),
  absolutePath: outputFile,
  operation: 'write',
  hash: hashContent(content),
  bytes: Buffer.byteLength(content),
  methodCount,
  inputSourcePaths,
  content,
});

const stripTargetContent = (target) => {
  const { content, ...publicTarget } = target;
  return publicTarget;
};

const stripBuildPlanPrivate = (plan) => {
  const { _private, ...publicPlan } = plan;
  return publicPlan;
};

export const createBackendBuildPlan = (options = {}) => {
  const {
    cwd = process.cwd(),
    dirs = ['./src/modules'],
    middlewareDir = './src/middleware',
    setup = './src/setup.js',
    outdir = './.rtgl-be/generated',
  } = options;

  const resolvedOutdir = path.resolve(cwd, outdir);
  const { methodDirs, middlewareDirs } = resolveContractDirs({
    cwd,
    dirs,
    middlewareDir,
  });

  const analysis = validateRpcDirs({
    methodDirs,
    middlewareDirs,
    errorPrefix: '[Build]',
  });

  const methods = collectResolvedMethodContracts({ index: analysis.index });
  const registryPath = path.join(resolvedOutdir, 'registry.js');
  const appEntryPath = path.join(resolvedOutdir, 'app.js');
  const inputSourcePaths = [
    ...methods.flatMap((method) => [
      method.contractPath,
      method.examplesPath,
      method.handlerPath,
    ]),
    ...analysis.middlewareEntries.map((entry) => entry.filePath),
    path.resolve(cwd, setup),
  ].map((filePath) => toPosixRelativePath(cwd, filePath)).sort();
  const registryContent = createGeneratedRegistryContent({
    outputFile: registryPath,
    methods,
    middlewareEntries: analysis.middlewareEntries,
  });
  const appEntryContent = createGeneratedAppEntryContent({
    outputFile: appEntryPath,
    setupPath: path.resolve(cwd, setup),
  });
  const privateTargets = [
    createTarget({
      cwd,
      outputFile: registryPath,
      kind: 'registry',
      content: registryContent,
      inputSourcePaths,
      methodCount: methods.length,
    }),
    createTarget({
      cwd,
      outputFile: appEntryPath,
      kind: 'app',
      content: appEntryContent,
      inputSourcePaths,
      methodCount: methods.length,
    }),
  ];

  return {
    schemaVersion: 'rettangoli.buildPlan/v1',
    ok: true,
    outdir: toPosixRelativePath(cwd, resolvedOutdir),
    methodCount: methods.length,
    inputSourcePaths,
    targets: privateTargets.map(stripTargetContent),
    _private: {
      targets: privateTargets,
    },
  };
};

export const applyBackendBuildPlan = (plan) => {
  plan._private.targets.forEach((target) => {
    mkdirSync(path.dirname(target.absolutePath), { recursive: true });
    writeFileSync(target.absolutePath, target.content);
  });

  return plan;
};

export const checkBackendBuildPlanFreshness = (plan) => {
  const targets = plan._private.targets.map((target) => {
    const actualHash = hashFile(target.absolutePath);
    return {
      path: target.path,
      kind: target.kind,
      exists: actualHash !== undefined,
      expectedHash: target.hash,
      actualHash,
      fresh: actualHash === target.hash,
    };
  });

  return {
    schemaVersion: 'rettangoli.buildFreshness/v1',
    ok: targets.every((target) => target.fresh),
    targets,
  };
};

const buildRettangoliBackend = (options = {}) => {
  const {
    silent = false,
    dryRun = false,
    check = false,
    format,
  } = options;

  const plan = createBackendBuildPlan(options);
  const freshness = check ? checkBackendBuildPlanFreshness(plan) : undefined;

  if (!dryRun && !check) {
    applyBackendBuildPlan(plan);
  }

  const result = {
    ...stripBuildPlanPrivate(plan),
    freshness,
  };

  if (!silent) {
    if (format === 'json' || options.json) {
      process.stdout.write(stringifyStableJson(result));
    } else if (check) {
      console.log(`[Build] Generated backend files are ${freshness.ok ? 'fresh' : 'stale'}.`);
    } else if (dryRun) {
      console.log(`[Build] Planned ${plan.targets.length} generated backend file(s).`);
    } else {
      plan.targets.forEach((target) => {
        console.log(`[Build] Generated backend ${target.kind}: ${target.absolutePath}`);
      });
    }
  }

  if (check && !freshness.ok) {
    process.exitCode = 1;
  }

  return {
    ...result,
    registryPath: plan._private.targets.find((target) => target.kind === 'registry')?.absolutePath,
    appEntryPath: plan._private.targets.find((target) => target.kind === 'app')?.absolutePath,
  };
};

export default buildRettangoliBackend;
