import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  collectResolvedMethodContracts,
  validateRpcDirs,
} from '../core/contracts/rpcFiles.js';
import { resolveContractDirs } from './contracts.js';

const toPosixRelativeImport = (fromFilePath, toFilePath) => {
  const relativePath = path.relative(path.dirname(fromFilePath), toFilePath).replaceAll(path.sep, '/');
  if (relativePath.startsWith('.')) {
    return relativePath;
  }
  return `./${relativePath}`;
};

const writeGeneratedRegistry = ({
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

  writeFileSync(outputFile, `${lines.join('\n')}\n`);
};

const writeGeneratedAppEntry = ({
  outputFile,
  setupPath,
  domainErrors = {},
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
    `  domainErrors: ${JSON.stringify(domainErrors, null, 2)},`,
    '});',
    '',
    'export default app;',
  ];

  writeFileSync(outputFile, `${lines.join('\n')}\n`);
};

const buildRettangoliBackend = (options = {}) => {
  const {
    cwd = process.cwd(),
    dirs = ['./src/modules'],
    middlewareDir = './src/middleware',
    setup = './src/setup.js',
    outdir = './.rtgl-be/generated',
    domainErrors = {},
  } = options;

  const resolvedOutdir = path.resolve(cwd, outdir);
  mkdirSync(resolvedOutdir, { recursive: true });

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

  writeGeneratedRegistry({
    outputFile: registryPath,
    methods,
    middlewareEntries: analysis.middlewareEntries,
  });

  writeGeneratedAppEntry({
    outputFile: appEntryPath,
    setupPath: path.resolve(cwd, setup),
    domainErrors,
  });

  console.log(`[Build] Generated backend registry: ${registryPath}`);
  console.log(`[Build] Generated backend app entry: ${appEntryPath}`);

  return {
    registryPath,
    appEntryPath,
    methodCount: methods.length,
  };
};

export default buildRettangoliBackend;
