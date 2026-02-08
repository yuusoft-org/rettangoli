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

function summarizeValues(values) {
  const validValues = values
    .filter((value) => typeof value === "number" && Number.isFinite(value));

  return {
    avgMs: Number(average(validValues).toFixed(2)),
    p50Ms: Number(percentile(validValues, 0.5).toFixed(2)),
    p95Ms: Number(percentile(validValues, 0.95).toFixed(2)),
    maxMs: Number((validValues.length ? Math.max(...validValues) : 0).toFixed(2)),
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
      schedulingPolicy,
    } = options;

    this.totalTasks = totalTasks;
    this.metricsPath = metricsPath;
    this.workerCount = workerCount;
    this.isolationMode = isolationMode;
    this.maxRetries = maxRetries;
    this.adaptivePolicy = adaptivePolicy;
    this.schedulingPolicy = schedulingPolicy;

    this.startedAt = Date.now();
    this.completed = 0;
    this.successes = [];
    this.failures = [];
    this.retries = [];
    this.recycles = [];
    this.attempts = [];
  }

  recordSuccess(task, result, meta = {}) {
    this.completed += 1;
    this.successes.push({
      path: task.path,
      attempt: result.attempt,
      workerId: result.workerId,
      strategy: result.strategy,
      screenshotCount: result.screenshotCount,
      timings: result.timings,
      queueType: meta.queueType,
      queueWaitMs: meta.queueWaitMs,
      attemptMs: meta.attemptMs,
    });
    this.attempts.push({
      path: task.path,
      attempt: result.attempt,
      workerId: meta.workerId ?? result.workerId,
      outcome: "success",
      queueType: meta.queueType,
      queueWaitMs: meta.queueWaitMs,
      attemptMs: meta.attemptMs,
    });

    const timing = result.timings?.totalMs ? `${result.timings.totalMs.toFixed(0)}ms` : "n/a";
    console.log(`[${this.completed}/${this.totalTasks}] Captured ${task.path} (${timing})`);
  }

  recordRetry(task, attempt, errorMessage, meta = {}) {
    this.retries.push({
      path: task.path,
      attempt,
      error: errorMessage,
      workerId: meta.workerId,
      queueType: meta.queueType,
      queueWaitMs: meta.queueWaitMs,
      attemptMs: meta.attemptMs,
      timestamp: new Date().toISOString(),
    });
    this.attempts.push({
      path: task.path,
      attempt,
      workerId: meta.workerId,
      outcome: "retry",
      queueType: meta.queueType,
      queueWaitMs: meta.queueWaitMs,
      attemptMs: meta.attemptMs,
    });
    console.warn(
      `Retry ${attempt}/${this.maxRetries} for ${task.path}: ${errorMessage}`,
    );
  }

  recordFailure(task, attempt, errorMessage, meta = {}) {
    this.completed += 1;
    this.failures.push({
      path: task.path,
      attempt,
      error: errorMessage,
      workerId: meta.workerId,
      queueType: meta.queueType,
      queueWaitMs: meta.queueWaitMs,
      attemptMs: meta.attemptMs,
      timestamp: new Date().toISOString(),
    });
    this.attempts.push({
      path: task.path,
      attempt,
      workerId: meta.workerId,
      outcome: "failure",
      queueType: meta.queueType,
      queueWaitMs: meta.queueWaitMs,
      attemptMs: meta.attemptMs,
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
    const durationMs = Date.now() - this.startedAt;
    const workerUtilization = [];
    for (let workerId = 1; workerId <= this.workerCount; workerId += 1) {
      const workerAttempts = this.attempts.filter((item) => item.workerId === workerId);
      const busyMsRaw = workerAttempts.reduce((sum, item) => sum + (item.attemptMs ?? 0), 0);
      const busyMs = Number(busyMsRaw.toFixed(2));
      const utilizationPct = durationMs > 0
        ? Number(Math.min(100, (busyMsRaw / durationMs) * 100).toFixed(2))
        : 0;
      workerUtilization.push({
        workerId,
        attempts: workerAttempts.length,
        successful: workerAttempts.filter((item) => item.outcome === "success").length,
        retries: workerAttempts.filter((item) => item.outcome === "retry").length,
        failures: workerAttempts.filter((item) => item.outcome === "failure").length,
        busyMs,
        utilizationPct,
      });
    }

    return {
      totalTasks: this.totalTasks,
      completed: this.completed,
      successful: this.successes.length,
      failed: this.failures.length,
      retries: this.retries.length,
      attempts: this.attempts.length,
      durationMs,
      workerCount: this.workerCount,
      isolationMode: this.isolationMode,
      maxRetries: this.maxRetries,
      adaptivePolicy: this.adaptivePolicy,
      schedulingPolicy: this.schedulingPolicy,
      timings: {
        totalMs: summarizeMetric(this.successes, "totalMs"),
        sessionMs: summarizeMetric(this.successes, "sessionMs"),
        resetMs: summarizeMetric(this.successes, "resetMs"),
        navigationMs: summarizeMetric(this.successes, "navigationMs"),
        readyMs: summarizeMetric(this.successes, "readyMs"),
        settleMs: summarizeMetric(this.successes, "settleMs"),
        initialScreenshotMs: summarizeMetric(this.successes, "initialScreenshotMs"),
        stepsMs: summarizeMetric(this.successes, "stepsMs"),
        attemptMs: summarizeValues(this.attempts.map((item) => item.attemptMs)),
        queueWaitMs: summarizeValues(this.attempts.map((item) => item.queueWaitMs)),
      },
      workerUtilization,
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
      attempts: this.attempts,
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
