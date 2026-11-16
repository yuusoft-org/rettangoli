let nextId = 1;
const seen = new Set();

export const createInitialState = () => ({ ids: [] });

export const selectViewData = ({ state }) => ({ ids: state.ids });

export const addItem = ({ state }) => {
  seen.add(nextId);
  state.ids.push(nextId);
  nextId += 1;
};
