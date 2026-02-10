import { chromium } from "playwright";
import { PlaywrightRunner } from "./playwright-runner.js";
import { ResultCollector } from "./result-collector.js";
import { resolveWorkerPlan } from "./worker-plan.js";

function nowMs() {
  return performance.now();
}

function createTaskQueues(tasks) {
  const freshQueue = tasks
    .map((task, sourceOrder) => ({
      task,
      sourceOrder,
      attempt: 1,
      queueType: "fresh",
      enqueuedAtMs: nowMs(),
    }))
    .sort((left, right) => {
      const leftCost = left.task.estimatedCost ?? 0;
      const rightCost = right.task.estimatedCost ?? 0;
      if (leftCost !== rightCost) {
        return leftCost - rightCost;
      }
      return right.sourceOrder - left.sourceOrder;
    });

  const retryQueue = [];
  let dispatchCount = 0;
  const fairRetryInterval = 4; // 3 fresh dispatches then 1 retry when available

  const getNextTask = () => {
    const shouldDispatchRetry = retryQueue.length > 0
      && (freshQueue.length === 0 || (dispatchCount % fairRetryInterval) === (fairRetryInterval - 1));

    if (shouldDispatchRetry) {
      dispatchCount += 1;
      return retryQueue.shift();
    }
    if (freshQueue.length > 0) {
      dispatchCount += 1;
      return freshQueue.pop();
    }
    if (retryQueue.length > 0) {
      dispatchCount += 1;
      return retryQueue.shift();
    }
    return null;
  };

  const enqueueRetry = (item) => {
    retryQueue.push({
      task: item.task,
      attempt: item.attempt + 1,
      queueType: "retry",
      enqueuedAtMs: nowMs(),
    });
  };

  return {
    getNextTask,
    enqueueRetry,
  };
}

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
    schedulingPolicy: {
      type: "duration-aware-fair-retry",
      freshBeforeRetry: 3,
    },
  });

  if (!tasks.length) {
    const { summary } = collector.finalize();
    return {
      summary,
      failures: [],
    };
  }

  const queue = createTaskQueues(tasks);
  const getNextTask = queue.getNextTask;

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

        const queueWaitMs = Math.max(0, nowMs() - item.enqueuedAtMs);
        const attemptStartMs = nowMs();

        try {
          const result = await runner.runTask(item.task, item.attempt);
          const attemptMs = nowMs() - attemptStartMs;
          collector.recordSuccess(item.task, result, {
            workerId: runner.workerId,
            queueType: item.queueType,
            queueWaitMs,
            attemptMs,
          });
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
          const attemptMs = nowMs() - attemptStartMs;
          if (item.attempt <= maxRetries) {
            collector.recordRetry(item.task, item.attempt, error.message, {
              workerId: runner.workerId,
              queueType: item.queueType,
              queueWaitMs,
              attemptMs,
            });
            queue.enqueueRetry(item);
            continue;
          }

          collector.recordFailure(item.task, item.attempt, error.message, {
            workerId: runner.workerId,
            queueType: item.queueType,
            queueWaitMs,
            attemptMs,
          });
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
