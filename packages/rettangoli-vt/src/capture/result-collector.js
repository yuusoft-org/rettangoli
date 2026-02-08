import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

function average(values) {
  if (!values.length) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[index];
}

function summarizeMetric(items, metricName) {
  const values = items
    .map((item) => item.timings?.[metricName])
    .filter((value) => typeof value === "number" && Number.isFinite(value));

  return {
    avgMs: Number(average(values).toFixed(2)),
    p50Ms: Number(percentile(values, 0.5).toFixed(2)),
    p95Ms: Number(percentile(values, 0.95).toFixed(2)),
    maxMs: Number((values.length ? Math.max(...values) : 0).toFixed(2)),
  };
}

export class ResultCollector {
  constructor(options) {
    const {
      totalTasks,
      metricsPath,
      workerCount,
      isolationMode,
      maxRetries,
      adaptivePolicy,
    } = options;

    this.totalTasks = totalTasks;
    this.metricsPath = metricsPath;
    this.workerCount = workerCount;
    this.isolationMode = isolationMode;
    this.maxRetries = maxRetries;
    this.adaptivePolicy = adaptivePolicy;

    this.startedAt = Date.now();
    this.completed = 0;
    this.successes = [];
    this.failures = [];
    this.retries = [];
    this.recycles = [];
  }

  recordSuccess(task, result) {
    this.completed += 1;
    this.successes.push({
      path: task.path,
      attempt: result.attempt,
      workerId: result.workerId,
      strategy: result.strategy,
      screenshotCount: result.screenshotCount,
      timings: result.timings,
    });

    const timing = result.timings?.totalMs ? `${result.timings.totalMs.toFixed(0)}ms` : "n/a";
    console.log(`[${this.completed}/${this.totalTasks}] Captured ${task.path} (${timing})`);
  }

  recordRetry(task, attempt, errorMessage) {
    this.retries.push({
      path: task.path,
      attempt,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
    console.warn(
      `Retry ${attempt}/${this.maxRetries} for ${task.path}: ${errorMessage}`,
    );
  }

  recordFailure(task, attempt, errorMessage) {
    this.completed += 1;
    this.failures.push({
      path: task.path,
      attempt,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
    console.error(`[${this.completed}/${this.totalTasks}] Failed ${task.path}: ${errorMessage}`);
  }

  recordRecycle(workerId, reason) {
    this.recycles.push({
      workerId,
      reason,
      timestamp: new Date().toISOString(),
    });
    console.log(`Worker ${workerId} recycled (${reason})`);
  }

  buildSummary() {
    return {
      totalTasks: this.totalTasks,
      completed: this.completed,
      successful: this.successes.length,
      failed: this.failures.length,
      retries: this.retries.length,
      durationMs: Date.now() - this.startedAt,
      workerCount: this.workerCount,
      isolationMode: this.isolationMode,
      maxRetries: this.maxRetries,
      adaptivePolicy: this.adaptivePolicy,
      timings: {
        totalMs: summarizeMetric(this.successes, "totalMs"),
        sessionMs: summarizeMetric(this.successes, "sessionMs"),
        navigationMs: summarizeMetric(this.successes, "navigationMs"),
        readyMs: summarizeMetric(this.successes, "readyMs"),
        settleMs: summarizeMetric(this.successes, "settleMs"),
        initialScreenshotMs: summarizeMetric(this.successes, "initialScreenshotMs"),
        stepsMs: summarizeMetric(this.successes, "stepsMs"),
      },
    };
  }

  writeMetrics(summary) {
    if (!this.metricsPath) {
      return;
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      summary,
      successes: this.successes,
      failures: this.failures,
      retries: this.retries,
      recycles: this.recycles,
    };

    mkdirSync(dirname(this.metricsPath), { recursive: true });
    writeFileSync(this.metricsPath, JSON.stringify(payload, null, 2));
    console.log(`Capture metrics written to ${this.metricsPath}`);
  }

  finalize() {
    const summary = this.buildSummary();
    this.writeMetrics(summary);
    return {
      summary,
      failures: this.failures,
    };
  }
}

