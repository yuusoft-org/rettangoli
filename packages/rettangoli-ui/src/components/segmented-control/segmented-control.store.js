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
  "sq",
];

const sizePresets = {
  sm: {
    controlHeight: 24,
    containerSizeAttrString: "h=24",
    optionSizeAttrString: "h=f w=1fg ph=md",
    textSize: "xs",
    iconSize: 14,
  },
  md: {
    controlHeight: 32,
    containerSizeAttrString: "",
    optionSizeAttrString: "w=1fg ph=lg pv=md",
    textSize: "sm",
    iconSize: 16,
  },
  lg: {
    controlHeight: 40,
    containerSizeAttrString: "h=40",
    optionSizeAttrString: "h=f w=1fg ph=xl",
    textSize: "md",
    iconSize: 22,
  },
};

const stringifyProps = (props = {}, additionalBlacklistedProps = []) => {
  return Object.entries(props)
    .filter(
      ([key]) =>
        !blacklistedProps.includes(key) &&
        !additionalBlacklistedProps.includes(key),
    )
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
};

export const createInitialState = () =>
  Object.freeze({
    selectedValue: null,
    hasSelectedValue: false,
    hoveredOptionId: null,
    hoveredAddOption: false,
    tooltipState: {
      open: false,
      x: 0,
      y: 0,
      place: "t",
      content: "",
    },
  });

export const selectViewData = ({ state, props }) => {
  const isSquare = !!props.sq;
  const containerAttrString = stringifyProps(props, isSquare ? ["w"] : []);
  const size = Object.prototype.hasOwnProperty.call(sizePresets, props.s)
    ? props.s
    : "md";
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
  const showAddOption = !isDisabled && !!props.addOption;
  const squareOptionCount = options.length + (showAddOption ? 1 : 0);
  const containerSizeAttrString = isSquare
    ? `h=${sizePreset.controlHeight} w=${sizePreset.controlHeight * squareOptionCount}`
    : sizePreset.containerSizeAttrString;
  const optionSizeAttrString = isSquare
    ? "h=f w=1fg"
    : sizePreset.optionSizeAttrString;

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
    isSquare,
    containerSizeAttrString,
    optionSizeAttrString,
    textSize: sizePreset.textSize,
    iconSize: sizePreset.iconSize,
    isDisabled,
    options: optionsWithSelection,
    selectedValue: currentValue,
    hasSelectedValue: hasCurrentValue,
    ariaLabel: props.placeholder || "Segmented control",
    hasTooltips: options.some(
      (option) =>
        typeof option.tooltip === "string" && option.tooltip.length > 0,
    ),
    tooltipState: state.tooltipState || {
      open: false,
      x: 0,
      y: 0,
      place: "t",
      content: "",
    },
    showAddOption,
    addOptionLabel: props.addOption?.label
      ? `+ ${props.addOption.label}`
      : "+ Add",
    addOptionAriaLabel: props.addOption?.label || "Add",
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

export const showTooltip = ({ state }, payload = {}) => {
  const { x, y, place = "t", content = "" } = payload;
  state.tooltipState = {
    open: true,
    x,
    y,
    place,
    content,
  };
};

export const hideTooltip = ({ state }) => {
  state.tooltipState = {
    ...state.tooltipState,
    open: false,
  };
};
