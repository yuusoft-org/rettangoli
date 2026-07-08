import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { stringifyStableJson } from './json.js';
import { createCliResult } from './results.js';

const hashValue = (value) => {
  const hash = createHash('sha256');
  hash.update(stringifyStableJson(value));
  return `sha256:${hash.digest('hex')}`;
};

const readJson = (cwd, filePath) => {
  return JSON.parse(readFileSync(path.resolve(cwd, filePath), 'utf8'));
};

const toErrorKeys = (errors = {}) => Object.keys(errors ?? {}).sort();

const createChange = ({
  severity,
  ruleId,
  method,
  filePath,
  message,
  before,
  after,
}) => ({
  schemaVersion: 'rettangoli.compatChange/v1',
  severity,
  ruleId,
  code: ruleId,
  method,
  filePath,
  message,
  before,
  after,
});

const createCompatErrorResult = ({ message }) => createCliResult({
  command: 'compat',
  artifactSchemaVersion: 'rettangoli.compat/v1',
  ok: false,
  status: 'error',
  summary: {
    methodsCompared: 0,
    changes: 0,
    breaking: 0,
    risky: 0,
    safe: 0,
  },
  changes: [],
  diagnostics: [
    {
      schemaVersion: 'rettangoli.diagnostic/v1',
      ruleId: 'RTGL-BE-COMPAT-009',
      code: 'RTGL-BE-COMPAT-009',
      severity: 'error',
      phase: 'compat',
      message,
    },
  ],
});

const createCompatErrorMessage = (error) => {
  if (error?.code === 'ENOENT') {
    return 'Manifest file not found.';
  }

  if (['EACCES', 'EPERM'].includes(error?.code)) {
    return 'Manifest file is not readable.';
  }

  if (typeof error?.code === 'string' && error.code.startsWith('E')) {
    return `Manifest file could not be read: ${error.code}.`;
  }

  if (error instanceof SyntaxError) {
    return `Manifest JSON is invalid: ${error.message}`;
  }

  return `Compat check failed: ${error.message}`;
};

const compareHashes = ({ changes, severity, ruleId, method, filePath, label, beforeValue, afterValue }) => {
  const beforeHash = hashValue(beforeValue);
  const afterHash = hashValue(afterValue);

  if (beforeHash === afterHash) {
    return;
  }

  changes.push(createChange({
    severity,
    ruleId,
    method,
    filePath,
    message: `${label} changed for '${method}'.`,
    before: beforeHash,
    after: afterHash,
  }));
};

export const runBackendCompat = (options = {}) => {
  const {
    cwd = process.cwd(),
    from,
    to,
    fromManifest = from ? readJson(cwd, from) : undefined,
    toManifest = to ? readJson(cwd, to) : undefined,
  } = options;

  if (!fromManifest || !toManifest) {
    throw new Error('Compat check requires --from and --to manifest JSON files.');
  }

  const fromMethods = fromManifest.methods ?? {};
  const toMethods = toManifest.methods ?? {};
  const methodIds = [...new Set([
    ...Object.keys(fromMethods),
    ...Object.keys(toMethods),
  ])].sort();
  const changes = [];

  methodIds.forEach((method) => {
    const before = fromMethods[method];
    const after = toMethods[method];
    const filePath = after?.source?.contract ?? before?.source?.contract;

    if (!before && after) {
      changes.push(createChange({
        severity: 'safe',
        ruleId: 'RTGL-BE-COMPAT-001',
        method,
        filePath,
        message: `Method '${method}' was added.`,
      }));
      return;
    }

    if (before && !after) {
      changes.push(createChange({
        severity: 'breaking',
        ruleId: 'RTGL-BE-COMPAT-002',
        method,
        filePath,
        message: `Method '${method}' was removed.`,
      }));
      return;
    }

    compareHashes({
      changes,
      severity: 'breaking',
      ruleId: 'RTGL-BE-COMPAT-003',
      method,
      filePath,
      label: 'Params schema',
      beforeValue: before.params,
      afterValue: after.params,
    });

    compareHashes({
      changes,
      severity: 'risky',
      ruleId: 'RTGL-BE-COMPAT-004',
      method,
      filePath,
      label: 'Result schema',
      beforeValue: before.result,
      afterValue: after.result,
    });

    const beforeErrorKeys = toErrorKeys(before.errors);
    const afterErrorKeys = toErrorKeys(after.errors);
    beforeErrorKeys
      .filter((errorCode) => !afterErrorKeys.includes(errorCode))
      .forEach((errorCode) => {
        changes.push(createChange({
          severity: 'breaking',
          ruleId: 'RTGL-BE-COMPAT-005',
          method,
          filePath,
          message: `Error '${errorCode}' was removed from '${method}'.`,
          before: errorCode,
        }));
      });
    afterErrorKeys
      .filter((errorCode) => !beforeErrorKeys.includes(errorCode))
      .forEach((errorCode) => {
        changes.push(createChange({
          severity: 'risky',
          ruleId: 'RTGL-BE-COMPAT-006',
          method,
          filePath,
          message: `Error '${errorCode}' was added to '${method}'.`,
          after: errorCode,
        }));
      });

    beforeErrorKeys
      .filter((errorCode) => afterErrorKeys.includes(errorCode))
      .forEach((errorCode) => {
        compareHashes({
          changes,
          severity: 'breaking',
          ruleId: 'RTGL-BE-COMPAT-007',
          method,
          filePath,
          label: `Error '${errorCode}' contract`,
          beforeValue: before.errors?.[errorCode],
          afterValue: after.errors?.[errorCode],
        });
      });

    compareHashes({
      changes,
      severity: 'risky',
      ruleId: 'RTGL-BE-COMPAT-008',
      method,
      filePath,
      label: 'Middleware requirements',
      beforeValue: before.middleware,
      afterValue: after.middleware,
    });
  });

  const breakingCount = changes.filter((change) => change.severity === 'breaking').length;
  const riskyCount = changes.filter((change) => change.severity === 'risky').length;
  const safeCount = changes.filter((change) => change.severity === 'safe').length;
  const ok = breakingCount === 0;
  const diagnostics = changes
    .filter((change) => change.severity === 'breaking')
    .map((change) => ({
      schemaVersion: 'rettangoli.diagnostic/v1',
      ruleId: change.ruleId,
      code: change.ruleId,
      severity: 'error',
      phase: 'compat',
      method: change.method,
      filePath: change.filePath,
      file: change.filePath ? { path: change.filePath } : undefined,
      message: change.message,
    }));

  return createCliResult({
    command: 'compat',
    artifactSchemaVersion: 'rettangoli.compat/v1',
    ok,
    status: changes.length === 0 ? 'unchanged' : ok ? 'compatible' : 'incompatible',
    from,
    to,
    summary: {
      methodsCompared: methodIds.length,
      changes: changes.length,
      breaking: breakingCount,
      risky: riskyCount,
      safe: safeCount,
    },
    changes,
    diagnostics,
  });
};

const compatRettangoliBackend = (options = {}) => {
  let result;
  try {
    result = runBackendCompat(options);
  } catch (error) {
    result = createCompatErrorResult({
      message: createCompatErrorMessage(error),
    });
  }
  const outputFormat = options.format === 'json' || options.json ? 'json' : 'text';

  if (outputFormat === 'json') {
    process.stdout.write(stringifyStableJson(result));
  } else if (result.ok) {
    console.log(`[Compat] ${result.status}: ${result.summary.changes} change(s).`);
  } else {
    console.error(`[Compat] incompatible: ${result.summary.breaking} breaking change(s).`);
  }

  if (!result.ok) {
    process.exitCode = 1;
  }

  return result;
};

export default compatRettangoliBackend;
