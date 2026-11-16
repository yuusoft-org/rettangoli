let clickCount = 0;
var lastTarget, pendingTimer;
export let exportedFlag = false;
const cache = new Map();
const items = [];
const registry = {};
const counters = { total: 0 };
const flags = {};
const nested = { a: {} };
const groups = { open: [] };
const aliased = new Set();
const defaults = {};

export const handleClick = (deps, payload = {}) => {
  clickCount += 1;
  lastTarget = payload._event?.target;
  cache.set(payload.id, payload);
  items.push(payload.id);
  registry[payload.id] = true;
  counters.total += 1;
  counters.total++;
  delete flags[payload.id];
  nested.a.b = 1;
  groups.open.push(payload.id);
  const local = aliased;
  local.add(payload.id);
  Object.assign(defaults, payload);
  deps.render();
};
