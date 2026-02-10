export const createInitialState = () => ({
  count: 0,
  showPanel: false,
});

export const selectViewData = ({ state }) => ({
  count: state.count,
  barHeight: Math.min(state.count * 20, 200),
  showPanel: state.showPanel,
});

export const increment = ({ state }) => {
  state.count += 1;
};

export const decrement = ({ state }) => {
  state.count = Math.max(0, state.count - 1);
};

export const togglePanel = ({ state }) => {
  state.showPanel = !state.showPanel;
};
