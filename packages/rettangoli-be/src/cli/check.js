import { collectResolvedMethodContracts } from '../core/contracts/rpcFiles.js';
import { analyzeRpcDirs, formatContractFailureReport } from './contracts.js';
import { resolveContractDirs } from './contracts.js';

const checkRettangoliBackend = (options = {}) => {
  const {
    cwd = process.cwd(),
    dirs = ['./src/modules'],
    middlewareDir = './src/middleware',
    format = 'text',
  } = options;

  const outputFormat = format === 'json' ? 'json' : 'text';
  const { methodDirs, middlewareDirs } = resolveContractDirs({
    cwd,
    dirs,
    middlewareDir,
  });

  const analysis = analyzeRpcDirs({ methodDirs, middlewareDirs });

  if (analysis.errors.length > 0) {
    if (outputFormat === 'json') {
      console.log(JSON.stringify({
        ok: false,
        prefix: '[Check]',
        summary: analysis.summary,
        errors: analysis.errors,
      }, null, 2));
    } else {
      console.error(formatContractFailureReport({
        errorPrefix: '[Check]',
        errors: analysis.errors,
      }));
    }

    process.exitCode = 1;
    return;
  }

  const methodCount = collectResolvedMethodContracts({ index: analysis.index }).length;

  if (outputFormat === 'json') {
    console.log(JSON.stringify({
      ok: true,
      prefix: '[Check]',
      methodCount,
      summary: analysis.summary,
    }, null, 2));
    return;
  }

  console.log(`[Check] RPC contracts passed for ${methodCount} method(s).`);
};

export default checkRettangoliBackend;
