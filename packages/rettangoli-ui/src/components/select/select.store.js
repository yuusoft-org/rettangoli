import { deepEqual } from '../../common.js';

// Attributes that should not be passed through to the container
// These are either handled internally or have special meaning
const blacklistedProps = [
  "id",
  "class",
  "style",
  "slot",
  // Select-specific props that are handled separately
  "placeholder",
  "selectedValue",
  "onChange",
  "options",
  "noClear",
  "addOption",
  "disabled",
];

const stringifyProps = (props = {}) => {
  return Object.entries(props)
    .filter(([key]) => !blacklistedProps.includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
};

const hasOwnProp = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const getOptionType = (option = {}) => {
  if (option.type === 'section') {
    return 'section';
  }

  if (option.type === 'separator') {
    return 'separator';
  }

  return 'item';
};
const isSelectableOption = (option = {}) => getOptionType(option) === 'item';

const getOptionIcon = (option = {}) => {
  return typeof option.icon === 'string' && option.icon.length > 0 ? option.icon : '';
};

const getOptionSuffixText = (option = {}) => {
  if (typeof option.shortcut === 'string' && option.shortcut.length > 0) {
    return option.shortcut;
  }

  if (typeof option.suffixText === 'string' && option.suffixText.length > 0) {
    return option.suffixText;
  }

  return '';
};

const normalizeOption = (option = {}, index, currentValue, hoveredOptionId, hasIconColumn) => {
  const type = getOptionType(option);
  const isSection = type === 'section';
  const isSeparator = type === 'separator';
  const isItem = type === 'item';

  if (isSection) {
    return {
      ...option,
      index,
      type,
      isSection,
      isSeparator,
      isItem,
    };
  }

  if (isSeparator) {
    return {
      ...option,
      index,
      type,
      isSection,
      isSeparator,
      isItem,
    };
  }

  const isSelected = deepEqual(option.value, currentValue);
  const isHovered = hoveredOptionId === index;
  const icon = getOptionIcon(option);
  const suffixText = getOptionSuffixText(option);

  return {
    ...option,
    index,
    type,
    isSection,
    isSeparator,
    isItem,
    isSelected,
    bgc: isHovered ? 'ac' : (isSelected ? 'mu' : ''),
    hasIconSlot: hasIconColumn,
    icon,
    hasIcon: icon.length > 0,
    iconColor: 'fg',
    c: 'fg',
    suffixText,
    hasSuffixText: suffixText.length > 0,
    suffixTextColor: 'mu-fg',
  };
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

export const selectViewData = ({ state, props }) => {
  // Generate container attribute string
  const containerAttrString = stringifyProps(props);
  const isDisabled = !!props.disabled;

  // Treat selectedValue as a controlled prop when provided by parent.
  const hasControlledValue = Object.prototype.hasOwnProperty.call(props || {}, "selectedValue");
  const currentValue = hasControlledValue ? props.selectedValue : state.selectedValue;

  // Calculate display label from value
  let displayLabel = props.placeholder || "Select an option";
  let isPlaceholderLabel = true;

  const options = props.options || [];
  const selectedOption = options.find((opt) => isSelectableOption(opt) && deepEqual(opt.value, currentValue));
  if (selectedOption) {
    displayLabel = selectedOption.label;
    isPlaceholderLabel = false;
  }

  const hasIconColumn = options.some((option) => isSelectableOption(option) && hasOwnProp(option, 'icon'));
  const optionsWithSelection = options.map((option, index) => {
    return normalizeOption(option, index, currentValue, state.hoveredOptionId, hasIconColumn);
  });
  const selectedOptionView = optionsWithSelection.find((option) => option.isItem && option.isSelected);

  return {
    containerAttrString,
    isDisabled,
    isOpen: state.isOpen,
    position: state.position,
    options: optionsWithSelection,
    selectedValue: currentValue,
    selectedLabel: displayLabel,
    selectedLabelColor: isPlaceholderLabel ? "mu-fg" : "fg",
    selectedIcon: selectedOptionView?.icon || "",
    hasSelectedIcon: !!selectedOptionView?.hasIcon,
    selectedIconColor: isPlaceholderLabel ? "mu-fg" : "fg",
    selectedSuffixText: selectedOptionView?.suffixText || "",
    hasSelectedSuffixText: !!selectedOptionView?.hasSuffixText,
    selectedSuffixTextColor: "mu-fg",
    selectButtonCursor: isDisabled ? "not-allowed" : "pointer",
    selectButtonHoverBorderColor: isDisabled ? "bo" : "ac",
    selectButtonTabIndex: isDisabled ? -1 : 0,
    hasValue: currentValue !== null && currentValue !== undefined,
    showClear: !isDisabled && !props.noClear && (currentValue !== null && currentValue !== undefined),
    showAddOption: !isDisabled && !!props.addOption,
    addOptionLabel: props.addOption?.label ? `+ ${props.addOption.label}` : "+ Add",
    addOptionBgc: state.hoveredAddOption ? "ac" : "",
  };
};

export const selectState = ({ state }) => {
  return state;
};

export const selectSelectedValue = ({ state }) => {
  return state.selectedValue;
};

export const openOptionsPopover = ({ state }, payload = {}) => {
  const { position, selectedIndex } = payload;
  state.position = position;
  state.isOpen = true;
  // Set hoveredOptionId to the selected option's index if available
  if (selectedIndex !== undefined && selectedIndex !== null) {
    state.hoveredOptionId = selectedIndex;
  }
};

export const closeOptionsPopover = ({ state }) => {
  state.isOpen = false;
};

export const updateSelectedValue = ({ state }, payload = {}) => {
  state.selectedValue = payload.value;
  state.isOpen = false;
};

export const resetSelection = ({ state }) => {
  state.selectedValue = undefined;
};

export const setHoveredOption = ({ state }, payload = {}) => {
  state.hoveredOptionId = payload.optionId;
};

export const clearHoveredOption = ({ state }) => {
  state.hoveredOptionId = null;
};

export const clearSelectedValue = ({ state }) => {
  state.selectedValue = undefined;
};

export const setHoveredAddOption = ({ state }, payload = {}) => {
  state.hoveredAddOption = !!payload.isHovered;
};
