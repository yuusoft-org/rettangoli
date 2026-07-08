import { runBackendResume } from './agentWorkflow.js';
import { stringifyStableJson } from './json.js';

const resumeRettangoliBackend = (options = {}) => {
  const result = runBackendResume(options);
  const outputFormat = options.format === 'json' || options.json ? 'json' : 'text';

  if (outputFormat === 'json') {
    process.stdout.write(stringifyStableJson(result));
  } else if (result.ok) {
    console.log(`[Resume] Task ${result.taskId} is current.`);
  } else {
    console.error(`[Resume] Task ${result.taskId || '<missing>'} is not current.`);
  }

  if (!result.ok) {
    process.exitCode = 1;
  }

  return result;
};

export default resumeRettangoliBackend;
