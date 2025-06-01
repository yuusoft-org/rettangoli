export const INITIAL_STATE = Object.freeze({
  isOpen: false,
});

export const toViewData = ({ state, props }) => {
  return {
    isOpen: state.isOpen,
    options: props.options || []
  };
}

export const selectState = ({ state }) => {
  return state;
}

export const setOpen = (state) => {
  state.open = true;
}

export const setState = (state) => {
  // do doSomething
}



