import { formatContractFailureReport } from './contracts.js';
import { analyzeBackendContracts } from './contractScope.js';

export const runBackendCheck = (options = {}) => {
  const analysis = analyzeBackendContracts(options);

  return {
    ok: analysis.ok,
    prefix: '[Check]',
    method: analysis.method,
    methodCount: options.method ? analysis.contracts.length : analysis.allContracts.length,
    summary: analysis.summary,
    errors: analysis.errors,
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
