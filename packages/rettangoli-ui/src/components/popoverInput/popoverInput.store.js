export const INITIAL_STATE = Object.freeze({
  isOpen: false,
  position: {
    x: 0,
    y: 0,
  },
  value: '',
  tempValue: '',
});

export const toViewData = ({ attrs, state, props }) => {
  // Use state's current value if it has been modified, otherwise use props
  const value = state.value || '-';

  return {
    isOpen: state.isOpen,
    position: state.position,
    value: value ?? '-',
    tempValue: state.tempValue,
    placeholder: props.placeholder ?? '',
    label: attrs.label,
  };
}

export const setTempValue = (state, value) => {
  state.tempValue = value;
}

export const openPopover = (state, payload) => {
  const { position } = payload;
  state.position = position;
  state.isOpen = true;
  // Reset the current value to match the display value when opening
  state.hasUnsavedChanges = false;
}

export const closePopover = (state) => {
  state.isOpen = false;
  state.tempValue = '';
}

export const setValue = (state, value) => {
  state.value = value;
}

export const selectValue = ({ state }) => {
  return state.value;
}
