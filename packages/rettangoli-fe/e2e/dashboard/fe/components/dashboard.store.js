export const createInitialState = () => ({
  resetCount: 0,
});

export const selectViewData = ({ state, constants }) => ({
  title: constants.title || 'Dashboard',
  resetCount: state.resetCount,
  resetWidth: Math.min(state.resetCount * 20, 100),
});

export const incrementReset = ({ state }) => {
  state.resetCount += 1;
};
