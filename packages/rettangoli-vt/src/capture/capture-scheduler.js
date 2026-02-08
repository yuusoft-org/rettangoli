import { chromium } from "playwright";
import { PlaywrightRunner } from "./playwright-runner.js";
import { ResultCollector } from "./result-collector.js";
import { resolveWorkerPlan } from "./worker-plan.js";

export async function runCaptureScheduler(options) {
  const {
    tasks,
    screenshotsDir,
    workerCount: requestedWorkers,
    isolationMode,
    screenshotWaitTime,
    waitEvent,
    waitSelector,
    waitStrategy,
    navigationTimeout,
    readyTimeout,
    screenshotTimeout,
    maxRetries,
    recycleEvery,
    metricsPath,
    headless,
  } = options;

  const { workerCount, adaptivePolicy } = resolveWorkerPlan(requestedWorkers);
  console.log(
    `Capture scheduler: mode=${adaptivePolicy.mode}, workers=${workerCount}, isolation=${isolationMode}`,
  );

  const collector = new ResultCollector({
    totalTasks: tasks.length,
    metricsPath,
    workerCount,
    isolationMode,
    maxRetries,
    adaptivePolicy,
  });

  if (!tasks.length) {
    const { summary } = collector.finalize();
    return {
      summary,
      failures: [],
    };
  }

  const queue = tasks.map((task) => ({ task, attempt: 1 })).reverse();
  const getNextTask = () => queue.pop();

  const browser = await chromium.launch({ headless });
  const runners = [];

  try {
    for (let index = 0; index < workerCount; index += 1) {
      const runner = new PlaywrightRunner({
        workerId: index + 1,
        browser,
        screenshotsDir,
        isolationMode,
        screenshotWaitTime,
        waitEvent,
        waitSelector,
        waitStrategy,
        navigationTimeout,
        readyTimeout,
        screenshotTimeout,
      });
      await runner.initialize();
      runners.push(runner);
    }

    const workerLoops = runners.map(async (runner) => {
      let processedSinceRecycle = 0;

      while (true) {
        const item = getNextTask();
        if (!item) {
          break;
        }

        try {
          const result = await runner.runTask(item.task, item.attempt);
          collector.recordSuccess(item.task, result);
          processedSinceRecycle += 1;

          if (
            isolationMode === "fast"
            && recycleEvery > 0
            && processedSinceRecycle >= recycleEvery
          ) {
            await runner.recycleSharedContext();
            collector.recordRecycle(runner.workerId, `recycleEvery=${recycleEvery}`);
            processedSinceRecycle = 0;
          }
        } catch (error) {
          if (item.attempt <= maxRetries) {
            collector.recordRetry(item.task, item.attempt, error.message);
            queue.push({
              task: item.task,
              attempt: item.attempt + 1,
            });
            continue;
          }

          collector.recordFailure(item.task, item.attempt, error.message);
        }
      }
    });

    await Promise.all(workerLoops);
  } finally {
    await Promise.all(
      runners.map(async (runner) => {
        await runner.dispose();
      }),
    );
    await browser.close();
  }

  const { summary, failures } = collector.finalize();
  return {
    summary,
    failures,
  };
}
