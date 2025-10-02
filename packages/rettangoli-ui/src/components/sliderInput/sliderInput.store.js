export const createInitialState = () => Object.freeze({
  value: 0
});

export const selectViewData = ({ state, attrs }) => {
  return {
    key: attrs.key,
    value: state.value,
    w: attrs.w || '',
    min: attrs.min || 0,
    max: attrs.max || 100,
    step: attrs.step || 1
  };
}

export const setValue = (state, newValue) => {
  state.value = newValue;
}