export const INITIAL_STATE = Object.freeze({});

export const toViewData = ({ state, props }) => {
  return {
    isOpen: props.isOpen,
    position: props.position,
  };
}

export const selectState = ({ state }) => {
  return state;
}
