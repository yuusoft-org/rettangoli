export const increment = ({ state }) => {
  state.count = (state.count || 0) + 1;
};
