import { sharedLimits } from "./limits.js";

const KINDS = new Set(["a", "b"]);
const LABELS = { a: "Alpha", b: "Beta" };
const ORDER = ["a", "b"];
const cache = new Map();
const items = [];

function describeKind(kind) {
  return LABELS[kind] ?? kind;
}

class Tracker {
  constructor() {
    this.entries = [];
  }

  track(entry) {
    this.entries.push(entry);
  }
}

export const handleSelect = (deps, payload = {}) => {
  const cache = new Map();
  cache.set(payload.kind, true);

  const tracker = new Tracker();
  tracker.track(payload);

  const sorted = [...ORDER].sort();
  const known = KINDS.has(payload.kind) && sorted.includes(payload.kind);
  payload.label = describeKind(payload.kind);
  sharedLimits.max = 10;

  deps.store.select({ kind: payload.kind, known, size: cache.size });
  deps.render();
};

export const handleCollect = (deps, items = []) => {
  items.push(deps.props.kind);
  for (const cache of [new Set()]) {
    cache.add(1);
  }
  try {
    deps.render();
  } catch (items) {
    items.message = "render failed";
  }
};

export const handleRead = (deps) => {
  return { size: cache.size, first: items[0], label: LABELS.a, count: ORDER.length };
};

const timersByStore = new WeakMap();
const mountedStores = new WeakSet();

export const handleBeforeMount = (deps) => {
  mountedStores.add(deps.store);
  timersByStore.set(deps.store, []);
  return () => {
    mountedStores.delete(deps.store);
    timersByStore.delete(deps.store);
  };
};
