
export const INITIAL_STATE = Object.freeze({
});

export const toViewData = ({ state, props }) => {
  return {
    ...state,
    ...props,
  };
};
