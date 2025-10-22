import { deepEqual } from '../../common.js';

// Attributes that should not be passed through to the container
// These are either handled internally or have special meaning
const blacklistedAttrs = [
  "id",
  "class",
  "style",
  "slot",
  // Select-specific props that are handled separately
  "placeholder",
  "selectedValue",
  "selected-value",
  "onChange",
  "on-change",
  "options"
];

const stringifyAttrs = (attrs) => {
  return Object.entries(attrs || {})
    .filter(([key]) => !blacklistedAttrs.includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
};

export const createInitialState = () => Object.freeze({
  isOpen: false,
  position: {
    x: 0,
    y: 0,
  },
  selectedValue: null,
  hoveredOptionId: null,
  hoveredAddOption: false,
});

export const selectViewData = ({ state, props, attrs }) => {
  // Generate container attribute string
  const containerAttrString = stringifyAttrs(attrs);

  // Use state's selected value if available, otherwise use props.selectedValue
  const currentValue = state.selectedValue !== null ? state.selectedValue : props.selectedValue;

  // Calculate display label from value
  let displayLabel = attrs.placeholder || 'Select an option';
  let isPlaceholderLabel = true;
  if (currentValue !== null && currentValue !== undefined && props.options) {
    const selectedOption = props.options.find(opt => deepEqual(opt.value, currentValue));
    if (selectedOption) {
      displayLabel = selectedOption.label;
      isPlaceholderLabel = false;
    }
  }

  // Map options to include isSelected flag and computed background color
  const optionsWithSelection = (props.options || []).map((option, index) => {
    const isSelected = deepEqual(option.value, currentValue);
    const isHovered = state.hoveredOptionId === index;
    return {
      ...option,
      isSelected,
      bgc: isHovered ? 'ac' : (isSelected ? 'mu' : '')
    };
  });

  console.log('attrs.placeholder', attrs.placeholder)

  return {
    containerAttrString,
    isOpen: state.isOpen,
    position: state.position,
    options: optionsWithSelection,
    selectedValue: currentValue,
    selectedLabel: displayLabel,
    selectedLabelColor: isPlaceholderLabel ? "mu-fg" : "fg",
    hasValue: currentValue !== null && currentValue !== undefined,
    showClear: !attrs['no-clear'] && !props['no-clear'] && (currentValue !== null && currentValue !== undefined),
    showAddOption: !!props.addOption,
    addOptionLabel: props.addOption?.label ? `+ ${props.addOption.label}` : '+ Add',
    addOptionBgc: state.hoveredAddOption ? 'ac' : ''
  };
}

export const selectState = ({ state }) => {
  return state;
}

export const selectSelectedValue = ({ state }) => {
  return state.selectedValue;
}

export const openOptionsPopover = (state, payload) => {
  const { position, selectedIndex } = payload;
  state.position = position;
  state.isOpen = true;
  // Set hoveredOptionId to the selected option's index if available
  if (selectedIndex !== undefined && selectedIndex !== null) {
    state.hoveredOptionId = selectedIndex;
  }
}

export const closeOptionsPopover = (state) => {
  state.isOpen = false;
}

export const updateSelectedValue = (state, payload) => {
  state.selectedValue = payload.value;
  state.isOpen = false;
}

export const resetSelection = (state) => {
  state.selectedValue = undefined;
}

export const setHoveredOption = (state, optionId) => {
  state.hoveredOptionId = optionId;
}

export const clearHoveredOption = (state) => {
  state.hoveredOptionId = null;
}

export const clearSelectedValue = (state) => {
  state.selectedValue = undefined;
}

export const setHoveredAddOption = (state, isHovered) => {
  state.hoveredAddOption = isHovered;
}



