export const createInitialState = () => ({
  items: [],
});

export const selectViewData = ({ state, props, constants }) => ({
  heading: props.heading,
  items: state.items,
  isFull: state.items.length >= constants.maxItems,
});

export const addItem = ({ state }, { label }) => {
  state.items.push({ label });
};

export const clearItems = ({ state }) => {
  state.items = [];
};
