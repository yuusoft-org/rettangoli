import { deepEqual } from "../../common.js";

const blacklistedProps = [
  "id",
  "class",
  "style",
  "slot",
  "placeholder",
  "selectedValue",
  "onChange",
  "options",
  "noClear",
  "addOption",
  "disabled",
  "s",
];

const sizePresets = {
  sm: {
    containerSizeAttrString: "h=24",
    optionSizeAttrString: "ph=md",
    textSize: "xs",
    iconSize: 14,
  },
  md: {
    containerSizeAttrString: "",
    optionSizeAttrString: "ph=lg pv=md",
    textSize: "sm",
    iconSize: 16,
  },
};

const stringifyProps = (props = {}) => {
  return Object.entries(props)
    .filter(([key]) => !blacklistedProps.includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
};

export const createInitialState = () =>
  Object.freeze({
    selectedValue: null,
    hasSelectedValue: false,
    hoveredOptionId: null,
    hoveredAddOption: false,
  });

export const selectViewData = ({ state, props }) => {
  const containerAttrString = stringifyProps(props);
  const size = sizePresets[props.s] ? props.s : "md";
  const sizePreset = sizePresets[size];
  const isDisabled = !!props.disabled;
  const hasControlledValue = Object.prototype.hasOwnProperty.call(
    props || {},
    "selectedValue",
  );
  const currentValue = hasControlledValue
    ? props.selectedValue
    : state.selectedValue;
  const hasCurrentValue = hasControlledValue ? true : !!state.hasSelectedValue;
  const options = props.options || [];

  const optionsWithSelection = options.map((option, index) => {
    const isSelected = hasCurrentValue && deepEqual(option.value, currentValue);
    const isHovered = state.hoveredOptionId === index;
    const hasSvg = typeof option.svg === "string" && option.svg.length > 0;
    const accessibleLabel = option.ariaLabel || option.label || "";

    return {
      ...option,
      hasSvg,
      accessibleLabel,
      isSelected,
      bgc: isSelected ? "ac" : isHovered && !isDisabled ? "mu" : "",
      textColor: isSelected ? "ac-fg" : "fg",
      borderLeftWidth: index === 0 ? "none" : "xs",
      cursor: isDisabled ? "not-allowed" : "pointer",
      tabIndex: isDisabled ? -1 : 0,
    };
  });

  return {
    containerAttrString,
    size,
    containerSizeAttrString: sizePreset.containerSizeAttrString,
    optionSizeAttrString: sizePreset.optionSizeAttrString,
    textSize: sizePreset.textSize,
    iconSize: sizePreset.iconSize,
    isDisabled,
    options: optionsWithSelection,
    selectedValue: currentValue,
    hasSelectedValue: hasCurrentValue,
    ariaLabel: props.placeholder || "Segmented control",
    showAddOption: !isDisabled && !!props.addOption,
    addOptionLabel: props.addOption?.label
      ? `+ ${props.addOption.label}`
      : "+ Add",
    addOptionBgc: state.hoveredAddOption ? "mu" : "",
    addOptionBorderLeftWidth: options.length === 0 ? "none" : "xs",
  };
};

export const selectState = ({ state }) => {
  return state;
};

export const selectSelectedValue = ({ state }) => {
  return state.selectedValue;
};

export const selectHasSelectedValue = ({ state }) => {
  return !!state.hasSelectedValue;
};

export const updateSelectedValue = ({ state }, payload = {}) => {
  state.selectedValue = payload.value;
  state.hasSelectedValue = true;
};

export const clearSelectedValue = ({ state }) => {
  state.selectedValue = undefined;
  state.hasSelectedValue = false;
};

export const setHoveredOption = ({ state }, payload = {}) => {
  state.hoveredOptionId = payload.optionId;
};

export const clearHoveredOption = ({ state }) => {
  state.hoveredOptionId = null;
};

export const setHoveredAddOption = ({ state }, payload = {}) => {
  state.hoveredAddOption = !!payload.isHovered;
};
