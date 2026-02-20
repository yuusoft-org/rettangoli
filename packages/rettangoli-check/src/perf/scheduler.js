import os from "node:os";

const DEFAULT_CONCURRENCY = Math.max(1, Math.min(8, Number(os.availableParallelism?.() || os.cpus()?.length || 1)));

export const runDeterministicParallel = async ({
  items = [],
  worker = async (value) => value,
  concurrency = DEFAULT_CONCURRENCY,
  getKey = (value) => String(value),
} = {}) => {
  const normalizedItems = [...(Array.isArray(items) ? items : [])]
    .map((item, index) => ({
      item,
      key: String(getKey(item, index)),
      index,
    }))
    .sort((left, right) => left.key.localeCompare(right.key) || left.index - right.index);

  const width = Math.max(1, Number(concurrency) || DEFAULT_CONCURRENCY);
  const results = new Array(normalizedItems.length);
  let cursor = 0;

  const runWorker = async () => {
    while (cursor < normalizedItems.length) {
      const currentIndex = cursor;
      cursor += 1;
      const current = normalizedItems[currentIndex];
      const value = await worker(current.item, currentIndex);
      results[currentIndex] = {
        key: current.key,
        value,
      };
    }
  };

  const workers = [];
  for (let index = 0; index < Math.min(width, normalizedItems.length); index += 1) {
    workers.push(runWorker());
  }
  await Promise.all(workers);

  return results.map((entry) => entry.value);
};

export const recommendedSchedulerConcurrency = () => DEFAULT_CONCURRENCY;
