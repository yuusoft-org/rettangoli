export const createInitialState = () => ({
  totalClicks: 0,
  escActive: false,
});

export const selectViewData = ({ state, constants }) => ({
  headerLabel: constants.headerLabel || 'Dashboard',
  totalClicks: state.totalClicks,
  clickBarWidth: Math.min(state.totalClicks * 15, 150),
  escActive: state.escActive,
  escLabel: state.escActive ? 'ON' : 'OFF',
  escColor: state.escActive ? 'limegreen' : '#ccc',
});

export const incrementClicks = ({ state }) => {
  state.totalClicks += 1;
};

export const toggleEsc = ({ state }) => {
  state.escActive = !state.escActive;
};
