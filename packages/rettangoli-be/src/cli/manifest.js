import path from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { formatContractFailureReport } from './contracts.js';
import { analyzeBackendContracts } from './contractScope.js';
import { runBackendCheck } from './check.js';
import {
  createBackendCommands,
  createNextAction,
} from './agentLoop.js';
import { stringifyStableJson } from './json.js';
import { createCliResult } from './results.js';
import { collectBackendMigrationFacts } from './db.js';

export { stringifyStableJson } from './json.js';

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const readJsonFile = (filePath) => {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
};

const readFrameworkPackage = () => {
  return readJsonFile(new URL('../../package.json', import.meta.url));
};

const readAppPackage = (cwd) => {
  const packagePath = path.join(cwd, 'package.json');
  if (!existsSync(packagePath)) {
    return {};
  }

  return readJsonFile(packagePath);
};

const toPosixRelativePath = (cwd, filePath) => {
  return path.relative(cwd, filePath).replaceAll(path.sep, '/');
};

const hashFile = (filePath) => {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return `sha256:${hash.digest('hex')}`;
};

const hashStableValue = (value) => {
  const hash = createHash('sha256');
  hash.update(stringifyStableJson(value));
  return `sha256:${hash.digest('hex')}`;
};

const summarizeExamples = (methodEntry, rpc) => {
  const summary = {
    success: 0,
    errors: {},
    cases: [],
  };

  const documents = methodEntry.examplesDocuments[0]?.documents ?? [];
  documents
    .filter((doc) => isPlainObject(doc) && Object.prototype.hasOwnProperty.call(doc, 'case'))
    .forEach((caseDoc) => {
      const caseName = typeof caseDoc.case === 'string' ? caseDoc.case : '<unnamed>';
      if (Object.prototype.hasOwnProperty.call(caseDoc, 'throws')) {
        summary.cases.push({
          case: caseName,
          proves: {
            kind: 'throws',
          },
        });
        return;
      }

      if (caseDoc.proves?.result === 'success') {
        summary.success += 1;
        summary.cases.push({
          case: caseName,
          proves: {
            kind: 'result',
            target: 'success',
          },
        });
        return;
      }

      if (typeof caseDoc.proves?.error === 'string' && caseDoc.proves.error.trim()) {
        const errorCode = caseDoc.proves.error;
        summary.errors[errorCode] = (summary.errors[errorCode] ?? 0) + 1;
        summary.cases.push({
          case: caseName,
          proves: {
            kind: 'error',
            target: errorCode,
          },
        });
        return;
      }

      summary.cases.push({
        case: caseName,
        proves: {
          kind: 'none',
        },
      });
    });

  const declaredErrors = Object.keys(rpc.errors ?? {}).sort();
  const provenErrors = Object.keys(summary.errors).sort();
  const missingErrors = declaredErrors.filter((errorCode) => !provenErrors.includes(errorCode));

  summary.coverage = {
    ok: summary.success > 0 && missingErrors.length === 0,
    success: {
      proved: summary.success > 0,
      count: summary.success,
    },
    errors: {
      declared: declaredErrors,
      proved: provenErrors,
      missing: missingErrors,
    },
  };

  return summary;
};

const buildMethodEntryByMethod = (index) => {
  const methodEntryByMethod = new Map();

  Object.values(index).forEach((methodEntry) => {
    const rpc = methodEntry.rpcObjects[0]?.rpcObject;
    if (typeof rpc?.method === 'string') {
      methodEntryByMethod.set(rpc.method, methodEntry);
    }
  });

  return methodEntryByMethod;
};

const buildMiddlewareEntryByName = (middlewareEntries = []) => {
  return new Map(middlewareEntries.map((entry) => [entry.middlewareName, entry]));
};

const createMiddlewareFacts = ({ cwd, middlewareEntryByName, names = [], phase }) => {
  return names.map((name) => {
    const entry = middlewareEntryByName.get(name);
    return {
      name,
      phase,
      path: entry ? toPosixRelativePath(cwd, entry.filePath) : undefined,
      hash: entry ? hashFile(entry.filePath) : undefined,
    };
  });
};

const createProtocolPolicy = () => ({
  jsonrpc: '2.0',
  request: {
    mode: 'single',
    batch: false,
    notifications: false,
    params: {
      type: 'object',
      positional: false,
    },
    id: {
      types: ['string', 'number'],
      null: false,
    },
  },
  errors: {
    standard: {
      parseError: -32700,
      invalidRequest: -32600,
      methodNotFound: -32601,
      invalidParams: -32602,
      internalError: -32603,
    },
    domain: {
      jsonRpcCode: -32000,
      source: 'contract.errors',
    },
  },
});

export const createBackendManifest = ({
  cwd = process.cwd(),
  dirs = ['./src/modules'],
  middlewareDir = './src/middleware',
  method,
  migrationsDir = './migrations',
  outdir = './.rtgl-be/generated',
} = {}) => {
  const analysis = analyzeBackendContracts({
    cwd,
    dirs,
    middlewareDir,
    method,
  });

  if (!analysis.ok) {
    throw new Error(formatContractFailureReport({
      errorPrefix: '[Manifest]',
      errors: analysis.errors,
    }));
  }

  const frameworkPackage = readFrameworkPackage();
  const appPackage = readAppPackage(cwd);
  const contracts = analysis.contracts;
  const methodEntryByMethod = buildMethodEntryByMethod(analysis.index);
  const middlewareEntryByName = buildMiddlewareEntryByName(analysis.middlewareEntries);
  const database = collectBackendMigrationFacts({ cwd, migrationsDir });
  const resolvedOutdir = path.resolve(cwd, outdir);
  const methods = {};

  contracts.forEach((contract) => {
    const methodEntry = methodEntryByMethod.get(contract.method);
    const rpc = contract.rpc;
    const source = {
      contract: toPosixRelativePath(cwd, contract.contractPath),
      examples: toPosixRelativePath(cwd, contract.examplesPath),
      handler: toPosixRelativePath(cwd, contract.handlerPath),
    };
    const hashes = {
      contract: hashFile(contract.contractPath),
      examples: hashFile(contract.examplesPath),
      handler: hashFile(contract.handlerPath),
    };
    const beforeMiddleware = createMiddlewareFacts({
      cwd,
      middlewareEntryByName,
      names: rpc.middleware?.before ?? [],
      phase: 'before',
    });
    const afterMiddleware = createMiddlewareFacts({
      cwd,
      middlewareEntryByName,
      names: rpc.middleware?.after ?? [],
      phase: 'after',
    });
    const sharedFiles = [
      ...beforeMiddleware,
      ...afterMiddleware,
    ].map((entry) => entry.path).filter(Boolean);
    const methodFolder = toPosixRelativePath(cwd, path.dirname(contract.contractPath));
    const packageHash = hashStableValue({
      method: contract.method,
      source,
      hashes,
      middleware: {
        before: beforeMiddleware,
        after: afterMiddleware,
      },
    });

    methods[contract.method] = {
      domain: contract.domain,
      action: contract.action,
      methodFolder,
      packageHash,
      setupDependencyPath: `setup.deps.${contract.domain}`,
      source,
      files: {
        owned: Object.values(source).sort(),
        shared: [...new Set(sharedFiles)].sort(),
      },
      hashes,
      description: rpc.description,
      middleware: {
        before: rpc.middleware?.before ?? [],
        after: rpc.middleware?.after ?? [],
      },
      middlewareFacts: {
        before: beforeMiddleware,
        after: afterMiddleware,
      },
      params: rpc.params,
      result: rpc.result,
      errors: rpc.errors ?? {},
      examples: summarizeExamples(methodEntry, rpc),
    };
  });

  return {
    schemaVersion: 'rettangoli.manifest/v1',
    framework: {
      name: frameworkPackage.name ?? '@rettangoli/be',
      version: frameworkPackage.version ?? '0.0.0',
    },
    protocol: createProtocolPolicy(),
    app: {
      name: appPackage.name,
      version: appPackage.version,
    },
    generatedTargets: [
      {
        kind: 'registry',
        path: toPosixRelativePath(cwd, path.join(resolvedOutdir, 'registry.js')),
      },
      {
        kind: 'app',
        path: toPosixRelativePath(cwd, path.join(resolvedOutdir, 'app.js')),
      },
    ],
    database,
    methods,
  };
};

const manifestRettangoliBackend = (options = {}) => {
  const outputFormat = options.format === 'json' || options.json ? 'json' : 'text';
  const check = runBackendCheck(options);

  if (!check.ok) {
    const commands = createBackendCommands({
      dirs: options.dirs,
      method: options.method,
      middlewareDir: options.middlewareDir,
      outdir: options.outdir,
      migrationsDir: options.migrationsDir,
    });
    const result = createCliResult({
      command: 'manifest',
      artifactSchemaVersion: 'rettangoli.manifest/v1',
      ok: false,
      phase: 'contracts',
      scope: check.scope,
      summary: check.summary,
      errors: check.errors,
      diagnostics: check.diagnostics,
      nextAction: createNextAction({
        ok: false,
        failedPhase: 'contracts',
        diagnostics: check.diagnostics,
        commands,
      }),
    });

    if (outputFormat === 'json') {
      process.stdout.write(stringifyStableJson(result));
      process.exitCode = 1;
      return result;
    }

    throw new Error(formatContractFailureReport({
      errorPrefix: '[Manifest]',
      errors: check.errors,
    }));
  }

  const manifest = createBackendManifest(options);
  const json = stringifyStableJson(manifest);

  if (options.output) {
    const outputPath = path.resolve(options.cwd ?? process.cwd(), options.output);
    writeFileSync(outputPath, json);
  } else {
    process.stdout.write(json);
  }

  return manifest;
};

export default manifestRettangoliBackend;
