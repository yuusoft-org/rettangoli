export const createInitialState = ({ props }) => ({
  title: "Rettangoli TUI Dashboard",
  environmentLabel: props.environment ? `env:${props.environment}` : "env:local",
  metrics: {
    activeUsers: 128,
    queueDepth: 7,
  },
  search: "error",
  lastKey: "none",
});

export const selectViewData = ({ state }) => {
  return state;
};

export const refresh = ({ state }) => {
  state.metrics.queueDepth += 1;
};

export const queueUp = ({ state }) => {
  state.metrics.queueDepth += 1;
};

export const queueDown = ({ state }) => {
  state.metrics.queueDepth = Math.max(0, state.metrics.queueDepth - 1);
};

export const setLastKey = ({ state }, payload = {}) => {
  state.lastKey = payload.key || "unknown";
};
