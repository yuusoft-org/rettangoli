export const INITIAL_STATE = Object.freeze({
  items: [],
  currentId: null,
  contentContainer: null
});

export const toViewData = ({ state }) => {
  return {
    items: state.items.map((item) => {
      return {
        ...item,
        c: item.id === state.currentId ? 'fg' : 'mu-fg'
      }
    }),
    currentId: state.currentId
  };
}

export const selectState = ({ state }) => {
  return state;
}

export const selectCurrentId = ({ state }) => {
  return state.currentId;
}

export const setItems = (state, items) => {
  state.items = items;
}

export const setCurrentId = (state, id) => {
  state.currentId = id;
}

export const setContentContainer = (state, container) => {
  state.contentContainer = container;
}



