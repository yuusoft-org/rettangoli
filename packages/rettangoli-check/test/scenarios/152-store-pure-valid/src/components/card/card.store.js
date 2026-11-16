import { formatLabel as format } from "./format.js";

const LIMIT = 10;

function clamp(value, { min = 0, max = LIMIT } = {}) {
  return Math.min(Math.max(value, min), max);
}

class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
}

export const createInitialState = ({ props, constants }) => ({
  items: [],
  byId: new Map(),
  window: { start: 0, end: LIMIT },
  createdAt: props.createdAt ? new Date(props.createdAt).toISOString() : undefined,
  title: constants?.title ?? "",
});

export const selectItemsByKind = ({ state }, kind) => state.items.filter((item) => item.kind === kind);

export const selectViewData = ({ state }) => {
  const { window: visible, items, ...rest } = state;
  const total = items.reduce(function sum(acc, item) {
    return acc + (item.count ?? 0);
  }, 0);
  const labels = [];
  for (const [index, { kind = "none" }] of items.entries()) {
    labels.push(format(`${index}:${kind}`));
  }
  for (let i = 0; i < labels.length; i += 1) {
    var last = labels[i];
  }
  let parsed;
  try {
    parsed = JSON.parse(rest.title);
  } catch (error) {
    parsed = String(error.message);
  }
  outer: for (const key in rest) {
    if (Object.hasOwn(rest, key)) {
      break outer;
    }
  }
  return {
    items: items.slice(visible.start, visible.end),
    total: clamp(total),
    last,
    parsed,
    range: new Range(visible.start, visible.end),
    max: Number.isFinite(total) ? Math.round(total) : Infinity,
    url: new URL("/items", "https://example.com").pathname,
    document: rest.document,
  };
};

export const setItems = ({ state }, { items, timestamp, _event }) => {
  state.items = structuredClone(items);
  state.updatedAt = new Date(timestamp).getTime();
  state.window.end = clamp(items.length, { max: LIMIT });
  state.fetch = _event?.detail?.fetch;
  state.isFile = _event?.detail?.file instanceof File;
  state.localStorage = hoisted();
};

function hoisted() {
  return typeof LIMIT === "number" ? parseInt("1", 10) : NaN;
}
