import os from "node:os";

const GIGABYTE = 1024 * 1024 * 1024;

function normalizeFinite(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

function normalizeCpuCount(cpuCount) {
  const normalized = Math.floor(normalizeFinite(cpuCount, 1));
  return Math.max(1, normalized);
}

function normalizeMemoryGb(totalMemoryGb) {
  const normalized = normalizeFinite(totalMemoryGb, 1);
  return Math.max(0.1, normalized);
}

export function resolveWorkerPlan(requestedWorkers, system = {}) {
  if (requestedWorkers !== undefined && requestedWorkers !== null) {
    if (!Number.isInteger(requestedWorkers) || requestedWorkers < 1) {
      throw new Error(
        `workerCount must be an integer >= 1, got ${requestedWorkers}.`,
      );
    }
  }

  const cpuCount = normalizeCpuCount(
    system.cpuCount ?? os.cpus()?.length ?? 1,
  );
  const cpuBound = Math.max(1, cpuCount - 1);

  const totalMemoryGb = normalizeMemoryGb(
    system.totalMemoryGb ?? (os.totalmem() / GIGABYTE),
  );
  const memoryBound = Math.max(1, Math.floor(totalMemoryGb / 1.5));
  const autoWorkers = Math.max(1, Math.min(cpuBound, memoryBound, 16));

  const baseAdaptivePolicy = {
    cpuCount,
    cpuBound,
    totalMemoryGb: Number(totalMemoryGb.toFixed(2)),
    memoryBound,
  };

  if (requestedWorkers !== undefined && requestedWorkers !== null) {
    return {
      workerCount: requestedWorkers,
      adaptivePolicy: {
        mode: "manual",
        ...baseAdaptivePolicy,
      },
    };
  }

  return {
    workerCount: autoWorkers,
    adaptivePolicy: {
      mode: "auto",
      ...baseAdaptivePolicy,
    },
  };
}
