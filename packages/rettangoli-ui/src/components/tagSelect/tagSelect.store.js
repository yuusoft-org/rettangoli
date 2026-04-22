import { deepEqual } from "../../common.js";

const blacklistedProps = [
  "id",
  "class",
  "style",
  "slot",
  "placeholder",
  "options",
  "selectedValues",
  "onChange",
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
  if (option.type === "section") {
    return "section";
  }

  if (option.type === "separator") {
    return "separator";
  }

  return "item";
};

const isSelectableOption = (option = {}) => getOptionType(option) === "item";

const getOptionIcon = (option = {}) => {
  return typeof option.icon === "string" && option.icon.length > 0 ? option.icon : "";
};

const getOptionSuffixText = (option = {}) => {
  if (typeof option.shortcut === "string" && option.shortcut.length > 0) {
    return option.shortcut;
  }

  if (typeof option.suffixText === "string" && option.suffixText.length > 0) {
    return option.suffixText;
  }

  return "";
};

const normalizeSelectedValues = (selectedValues) => {
  if (!Array.isArray(selectedValues)) {
    return [];
  }

  return [...selectedValues];
};

const sameValueArray = (left = [], right = []) => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => deepEqual(value, right[index]));
};

const isSelectedValue = (selectedValues = [], candidate) => {
  return selectedValues.some((value) => deepEqual(value, candidate));
};

const getCurrentValues = ({ state, props }) => {
  if (state.hasSelectedValues) {
    return normalizeSelectedValues(state.selectedValues);
  }

  return normalizeSelectedValues(props.selectedValues);
};

const getDraftValues = ({ state, props }) => {
  if (state.isOpen) {
    return normalizeSelectedValues(state.draftSelectedValues);
  }

  return getCurrentValues({ state, props });
};

const stringifyFallbackLabel = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
};

const findMatchingOption = (options = [], value) => {
  return options.find((option) => isSelectableOption(option) && deepEqual(option.value, value));
};

const buildTagStyle = ({ isSelected = true, isAddChip = false } = {}) => {
  const baseStyle = [
    "--tag-border-radius: var(--border-radius-md)",
    "--muted-foreground: var(--foreground)",
  ];

  if (isAddChip || !isSelected) {
    baseStyle.push("--muted: color-mix(in srgb, var(--muted) 82%, var(--background) 18%)");
  }

  return `${baseStyle.join("; ")};`;
};

const normalizeOption = ({
  option = {},
  index,
  selectedValues = [],
  hasIconColumn = false,
}) => {
  const type = getOptionType(option);
  const isSection = type === "section";
  const isSeparator = type === "separator";
  const isItem = type === "item";

  if (isSection || isSeparator) {
    return {
      ...option,
      index,
      type,
      isSection,
      isSeparator,
      isItem,
    };
  }

  const isSelected = isSelectedValue(selectedValues, option.value);
  const icon = getOptionIcon(option);
  const baseSuffixText = getOptionSuffixText(option);
  const suffixText = isSelected ? (baseSuffixText || "Added") : baseSuffixText;

  return {
    ...option,
    index,
    type,
    isSection,
    isSeparator,
    isItem,
    isSelected,
    hasIconSlot: hasIconColumn,
    icon,
    hasIcon: icon.length > 0,
    cursor: "pointer",
    tagStyle: buildTagStyle({ isSelected }),
    suffixText,
    hasSuffixText: suffixText.length > 0,
  };
};

export const createInitialState = () =>
  Object.freeze({
    isOpen: false,
    position: {
      x: 0,
      y: 0,
      w: 240,
    },
    selectedValues: [],
    draftSelectedValues: [],
    hasSelectedValues: false,
  });

export const selectViewData = ({ state, props }) => {
  const containerAttrString = stringifyProps(props);
  const isDisabled = !!props.disabled;
  const currentValues = getCurrentValues({ state, props });
  const draftValues = getDraftValues({ state, props });
  const shouldResolveOptions = state.isOpen || currentValues.length > 0;
  const options = shouldResolveOptions && Array.isArray(props.options) ? props.options : [];
  const hasIconColumn = options.some((option) => isSelectableOption(option) && hasOwnProp(option, "icon"));
  const normalizedOptions = options.map((option, index) =>
    normalizeOption({
      option,
      index,
      selectedValues: draftValues,
      hasIconColumn,
    }),
  );

  const selectedTags = currentValues.map((value, selectionIndex) => {
    const matchedOption = findMatchingOption(options, value);
    const icon = matchedOption ? getOptionIcon(matchedOption) : "";

    return {
      value,
      selectionIndex,
      label: matchedOption?.label || stringifyFallbackLabel(value),
      icon,
      hasIcon: icon.length > 0,
      testId: `tag-select-tag-${selectionIndex}`,
    };
  });

  const hasSelectableOptions = normalizedOptions.some((option) => option.isItem);
  const hasDraftChanges = !sameValueArray(currentValues, draftValues);
  const triggerTags = selectedTags.length > 0
    ? selectedTags.map((tag) => ({
      ...tag,
      tagStyle: buildTagStyle({ isSelected: true }),
    }))
    : [{
      value: undefined,
      selectionIndex: "",
      label: props.placeholder || "Add tag",
      icon: "",
      testId: "",
      tagStyle: buildTagStyle({ isAddChip: true }),
    }];

  return {
    containerAttrString,
    isDisabled,
    isOpen: state.isOpen,
    position: state.position,
    options: normalizedOptions,
    hasSelectableOptions,
    placeholder: props.placeholder || "Add tag",
    selectedTags,
    hasSelectedTags: selectedTags.length > 0,
    triggerTags,
    triggerTagStyle: buildTagStyle({ isSelected: true }),
    placeholderTagStyle: buildTagStyle({ isAddChip: true }),
    triggerCursor: isDisabled ? "not-allowed" : "pointer",
    triggerTabIndex: isDisabled ? -1 : 0,
    showAddOption: true,
    addOptionLabel: props.addOption?.label || "Add tag",
    hasDraftChanges,
    submitDisabled: isDisabled,
    submitLabel: "Save",
  };
};

export const selectSelectedValues = ({ state }) => {
  return normalizeSelectedValues(state.selectedValues);
};

export const selectHasSelectedValues = ({ state }) => {
  return !!state.hasSelectedValues;
};

export const selectDraftSelectedValues = ({ state }) => {
  return normalizeSelectedValues(state.draftSelectedValues);
};

export const openOptionsPopover = ({ state }, payload = {}) => {
  const { position, values } = payload;
  state.position = {
    ...state.position,
    ...(position || {}),
  };
  state.draftSelectedValues = normalizeSelectedValues(values);
  state.isOpen = true;
};

export const closeOptionsPopover = ({ state }) => {
  state.isOpen = false;
  state.draftSelectedValues = [];
};

export const updateDraftSelectedValues = ({ state }, payload = {}) => {
  state.draftSelectedValues = normalizeSelectedValues(payload.values);
};

export const updateSelectedValues = ({ state }, payload = {}) => {
  const values = normalizeSelectedValues(payload.values);
  state.selectedValues = values;
  state.hasSelectedValues = true;
  if (payload.syncDraft || !state.isOpen) {
    state.draftSelectedValues = [...values];
  }
};

export const toggleDraftSelectedValue = ({ state }, payload = {}) => {
  const draftValues = normalizeSelectedValues(state.draftSelectedValues);
  const value = payload.value;
  const existingIndex = draftValues.findIndex((currentValue) => deepEqual(currentValue, value));

  if (existingIndex >= 0) {
    state.draftSelectedValues = draftValues.filter((_, index) => index !== existingIndex);
    return;
  }

  state.draftSelectedValues = [...draftValues, value];
};

export const commitDraftSelectedValues = ({ state }) => {
  state.selectedValues = normalizeSelectedValues(state.draftSelectedValues);
  state.hasSelectedValues = true;
  state.isOpen = false;
  state.draftSelectedValues = [];
};
