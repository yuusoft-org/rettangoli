export const INITIAL_STATE = Object.freeze({
  isOpen: false,
  position: {
    x: 0,
    y: 0
  },
});

export const toViewData = ({ state, props }) => {
  return {
    isOpen: state.isOpen,
    position: state.position,
  };
}

export const selectState = ({ state }) => {
  return state;
}

export const setOpen = (state, position) => {
  state.isOpen = true;
  state.position = position;
}

export const setClose = (state) => {
  state.isOpen = false;
  state.position = { x: 0, y: 0 };
}
