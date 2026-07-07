import { formatContractFailureReport } from './contracts.js';
import { analyzeBackendContracts } from './contractScope.js';
import {
  createBackendCommands,
  createNextAction,
  createScope,
  findCommand,
  normalizeDiagnostics,
} from './agentLoop.js';

export const runBackendCheck = (options = {}) => {
  const analysis = analyzeBackendContracts(options);
  const methods = options.method
    ? analysis.contracts.map((contract) => contract.method)
    : analysis.allContracts.map((contract) => contract.method);
  const commands = createBackendCommands({
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

  return {
    schemaVersion: 'rettangoli.check/v1',
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
  };
};

const checkRettangoliBackend = (options = {}) => {
  const outputFormat = options.format === 'json' ? 'json' : 'text';
  const result = runBackendCheck(options);

  if (!result.ok) {
    if (outputFormat === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(formatContractFailureReport({
        errorPrefix: '[Check]',
        errors: result.errors,
      }));
    }

    process.exitCode = 1;
    return;
  }

  if (outputFormat === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const suffix = result.method ? ` for ${result.method}` : ` for ${result.methodCount} method(s)`;
  console.log(`[Check] RPC contracts passed${suffix}.`);
};

export default checkRettangoliBackend;
