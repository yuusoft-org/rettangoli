export const createInitialState = () => Object.freeze({
  value: 0
});

export const selectViewData = ({ state, props }) => {
  return {
    key: props.key,
    value: state.value,
    w: props.w || '',
    min: props.min || 0,
    max: props.max || 100,
    step: props.step || 1,
    disabled: Boolean(props.disabled),
  };
}

export const setValue = ({ state }, payload = {}) => {
  state.value = payload.value;
}
