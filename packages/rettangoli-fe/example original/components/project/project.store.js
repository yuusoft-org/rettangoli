
export const INITIAL_STATE = Object.freeze({
});

export const toViewData = ({ state, props, attrs }) => {
  return {
    ...state,
    ...props,
    ...attrs,
  };
};
