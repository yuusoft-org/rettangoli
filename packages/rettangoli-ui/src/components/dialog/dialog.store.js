export const INITIAL_STATE = Object.freeze({
  //
});

export const toViewData = ({ state, props }) => {
  return {
    isOpen: props.isOpen,
    w: props.w || 600,
    position: {
      x: 0,
      y: 0
    }
  };
}

export const selectState = ({ state }) => {
  return state;
}

export const setState = (state) => {
  // do doSomething
}



