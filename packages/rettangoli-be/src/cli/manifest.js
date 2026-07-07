import path from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { formatContractFailureReport } from './contracts.js';
import { analyzeBackendContracts } from './contractScope.js';

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

const summarizeExamples = (methodEntry) => {
  const summary = {
    success: 0,
    errors: {},
  };

  const documents = methodEntry.examplesDocuments[0]?.documents ?? [];
  documents
    .filter((doc) => isPlainObject(doc) && Object.prototype.hasOwnProperty.call(doc, 'case'))
    .forEach((caseDoc) => {
      if (Object.prototype.hasOwnProperty.call(caseDoc, 'throws')) {
        return;
      }

      const output = caseDoc.out;

      if (isPlainObject(output) && output._error === true) {
        const errorCode = output.code;
        if (typeof errorCode === 'string' && errorCode.trim()) {
          summary.errors[errorCode] = (summary.errors[errorCode] ?? 0) + 1;
        }
        return;
      }

      summary.success += 1;
    });

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
      examples: summarizeExamples(methodEntry),
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
