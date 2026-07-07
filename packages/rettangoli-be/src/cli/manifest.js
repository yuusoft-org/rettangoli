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

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeForStableJson = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForStableJson(entry));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, normalizeForStableJson(value[key])]),
  );
};

export const stringifyStableJson = (value) => {
  return `${JSON.stringify(normalizeForStableJson(value), null, 2)}\n`;
};

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

export const createBackendManifest = ({
  cwd = process.cwd(),
  dirs = ['./src/modules'],
  middlewareDir = './src/middleware',
  method,
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
  const methods = {};

  contracts.forEach((contract) => {
    const methodEntry = methodEntryByMethod.get(contract.method);
    const rpc = contract.rpc;

    methods[contract.method] = {
      domain: contract.domain,
      action: contract.action,
      setupDependencyPath: `setup.deps.${contract.domain}`,
      source: {
        contract: toPosixRelativePath(cwd, contract.contractPath),
        examples: toPosixRelativePath(cwd, contract.examplesPath),
        handler: toPosixRelativePath(cwd, contract.handlerPath),
      },
      hashes: {
        contract: hashFile(contract.contractPath),
        examples: hashFile(contract.examplesPath),
        handler: hashFile(contract.handlerPath),
      },
      description: rpc.description,
      middleware: {
        before: rpc.middleware?.before ?? [],
        after: rpc.middleware?.after ?? [],
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
    app: {
      name: appPackage.name,
      version: appPackage.version,
    },
    methods,
  };
};

const manifestRettangoliBackend = (options = {}) => {
  const outputFormat = options.format === 'json' || options.json ? 'json' : 'text';
  const check = runBackendCheck(options);

  if (!check.ok) {
    const commands = createBackendCommands({
      method: options.method,
      middlewareDir: options.middlewareDir,
    });
    const result = {
      schemaVersion: 'rettangoli.manifest/v1',
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
    };

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
