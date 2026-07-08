import { formatContractFailureReport } from './contracts.js';
import { analyzeBackendContracts } from './contractScope.js';
import {
  createBackendCommands,
  createNextAction,
  createScope,
  findCommand,
  normalizeDiagnostics,
} from './agentLoop.js';
import { stringifyStableJson } from './json.js';
import { createCliResult } from './results.js';

export const runBackendCheck = (options = {}) => {
  const analysis = analyzeBackendContracts(options);
  const methods = options.method
    ? analysis.contracts.map((contract) => contract.method)
    : analysis.allContracts.map((contract) => contract.method);
  const commands = createBackendCommands({
    dirs: options.dirs,
    method: options.method,
    middlewareDir: options.middlewareDir,
  });
  const diagnostics = normalizeDiagnostics({
    cwd: options.cwd ?? process.cwd(),
    errors: analysis.errors,
    phase: 'contracts',
    method: options.method,
    command: findCommand(commands, 'check'),
  });

  return createCliResult({
    command: 'check',
    artifactSchemaVersion: 'rettangoli.check/v1',
    ok: analysis.ok,
    prefix: '[Check]',
    method: analysis.method,
    scope: createScope({ method: options.method, methods }),
    methodCount: options.method ? analysis.contracts.length : analysis.allContracts.length,
    summary: analysis.summary,
    errors: analysis.errors,
    diagnostics,
    nextAction: createNextAction({
      ok: analysis.ok,
      failedPhase: analysis.ok ? undefined : 'contracts',
      diagnostics,
      commands,
    }),
  });
};

const checkRettangoliBackend = (options = {}) => {
  const outputFormat = options.format === 'json' ? 'json' : 'text';
  const result = runBackendCheck(options);

  if (!result.ok) {
    if (outputFormat === 'json') {
      process.stdout.write(stringifyStableJson(result));
    } else {
      console.error(formatContractFailureReport({
        errorPrefix: '[Check]',
        errors: result.errors,
      }));
    }

    process.exitCode = 1;
    return result;
  }

  if (outputFormat === 'json') {
    process.stdout.write(stringifyStableJson(result));
    return result;
  }

  const suffix = result.method ? ` for ${result.method}` : ` for ${result.methodCount} method(s)`;
  console.log(`[Check] RPC contracts passed${suffix}.`);
  return result;
};

export default checkRettangoliBackend;
