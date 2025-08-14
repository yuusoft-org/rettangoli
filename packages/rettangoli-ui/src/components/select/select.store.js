import { deepEqual } from '../../common.js';

export const INITIAL_STATE = Object.freeze({
  isOpen: false,
  position: {
    x: 0,
    y: 0,
  },
  selectedValue: null,
});

export const toViewData = ({ state, props }) => {
  // Use state's selected value if available, otherwise use props.selectedValue
  const currentValue = state.selectedValue !== null ? state.selectedValue : props.selectedValue;
  
  // Calculate display label from value
  let displayLabel = props.placeholder || 'Select an option';
  if (currentValue !== null && currentValue !== undefined && props.options) {
    const selectedOption = props.options.find(opt => deepEqual(opt.value, currentValue));
    if (selectedOption) {
      displayLabel = selectedOption.label;
    }
  }
  
  // Map options to include isSelected flag and computed background color
  const optionsWithSelection = (props.options || []).map(option => {
    const isSelected = deepEqual(option.value, currentValue);
    return {
      ...option,
      isSelected,
      bgc: isSelected ? 'mu' : ''
    };
  });
  
  return {
    isOpen: state.isOpen,
    position: state.position,
    options: optionsWithSelection,
    selectedValue: currentValue,
    selectedLabel: displayLabel,
    placeholder: props.placeholder || 'Select an option'
  };
}

export const selectState = ({ state }) => {
  return state;
}

export const openOptionsPopover = (state, payload) => {
  const { position } = payload;
  state.position = position;
  state.isOpen = true;
}

export const closeOptionsPopover = (state) => {
  state.isOpen = false;
}

export const updateSelectOption = (state, option) => {
  state.selectedValue = option.value;
  state.isOpen = false;
}

export const resetSelection = (state) => {
  state.selectedValue = undefined;
}



