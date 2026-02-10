export const createInitialState = () => Object.freeze({
  isOpen: false,
  position: {
    x: 0,
    y: 0,
  },
  value: '',
  tempValue: '',
});

export const selectViewData = ({ props, state }) => {
  const value = state.value || '-';

  return {
    isOpen: state.isOpen,
    position: state.position,
    value: value,
    tempValue: state.tempValue,
    placeholder: props.placeholder ?? '',
    label: props.label,
  };
}

export const setTempValue = ({ state }, payload = {}) => {
  state.tempValue = payload.value;
}

export const openPopover = ({ state }, payload = {}) => {
  const { position } = payload;
  state.position = position;
  state.isOpen = true;
  state.hasUnsavedChanges = false;
}

export const closePopover = ({ state }) => {
  state.isOpen = false;
  state.tempValue = '';
}

export const setValue = ({ state }, payload = {}) => {
  state.value = payload.value;
}

export const selectValue = ({ state }) => {
  return state.value;
}
