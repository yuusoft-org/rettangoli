
export const INITIAL_STATE = Object.freeze({
});

export const toViewData = ({ state, props }) => {
  return {
    items: props.items || [],
    isOpen: props.isOpen || false,
    position: props.position || {
      x: 0,
      y: 0,
    },
  };
}

export const selectState = ({ state }) => {
  return state;
}

export const setState = (state) => {
  // do doSomething
}



