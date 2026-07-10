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
  "searchable",
  "searchPlaceholder",
  "emptySearchLabel",
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

const normalizeSearchQuery = (query) => {
  if (query === undefined || query === null) {
    return "";
  }

  return String(query).trim().toLowerCase();
};

const optionLabelMatches = (option = {}, query = "") => {
  if (!query) {
    return true;
  }

  return String(option.label ?? "").toLowerCase().includes(query);
};

const collectOptionGroups = (options = []) => {
  const groups = [];
  let currentGroup = {
    section: null,
    entries: [],
  };

  options.forEach((option, index) => {
    const entry = {
      option,
      index,
      type: getOptionType(option),
    };

    if (entry.type === "section") {
      if (currentGroup.section || currentGroup.entries.length > 0) {
        groups.push(currentGroup);
      }

      currentGroup = {
        section: entry,
        entries: [],
      };
      return;
    }

    currentGroup.entries.push(entry);
  });

  if (currentGroup.section || currentGroup.entries.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
};

const filterOptionEntriesBySearch = (options = [], rawQuery = "") => {
  const query = normalizeSearchQuery(rawQuery);

  if (!query) {
    return options.map((option, index) => ({
      option,
      index,
    }));
  }

  return collectOptionGroups(options).flatMap((group) => {
    const sectionMatches = group.section ? optionLabelMatches(group.section.option, query) : false;
    const itemVisibility = group.entries.map((entry) => {
      if (entry.type !== "item") {
        return false;
      }

      return sectionMatches || optionLabelMatches(entry.option, query);
    });
    const hasVisibleItem = itemVisibility.some(Boolean);

    if (!sectionMatches && !hasVisibleItem) {
      return [];
    }

    const visibleEntries = [];

    if (group.section) {
      visibleEntries.push(group.section);
    }

    group.entries.forEach((entry, entryIndex) => {
      if (entry.type === "item") {
        if (itemVisibility[entryIndex]) {
          visibleEntries.push(entry);
        }
        return;
      }

      if (entry.type !== "separator") {
        return;
      }

      const hasVisibleItemBefore = itemVisibility
        .slice(0, entryIndex)
        .some(Boolean);
      const hasVisibleItemAfter = itemVisibility
        .slice(entryIndex + 1)
        .some(Boolean);

      if (hasVisibleItemBefore && hasVisibleItemAfter) {
        visibleEntries.push(entry);
      }
    });

    return visibleEntries.map(({ option, index }) => ({
      option,
      index,
    }));
  });
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
  searchQuery: "",
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
  const visibleOptionEntries = filterOptionEntriesBySearch(
    options,
    props.searchable ? state.searchQuery : "",
  );
  const optionsWithSelection = visibleOptionEntries.map(({ option, index }) => {
    return normalizeOption(option, index, currentValue, state.hoveredOptionId, hasIconColumn);
  });
  const selectedOptionIcon = getOptionIcon(selectedOption);
  const selectedOptionSuffixText = getOptionSuffixText(selectedOption);
  const normalizedSearchQuery = props.searchable ? state.searchQuery : "";
  const hasVisibleSelectableOptions = optionsWithSelection.some((option) => option.isItem);

  return {
    containerAttrString,
    isDisabled,
    isOpen: state.isOpen,
    position: state.position,
    options: optionsWithSelection,
    selectedValue: currentValue,
    selectedLabel: displayLabel,
    selectedLabelColor: isPlaceholderLabel ? "mu-fg" : "fg",
    selectedIcon: selectedOptionIcon,
    hasSelectedIcon: selectedOptionIcon.length > 0,
    selectedIconColor: isPlaceholderLabel ? "mu-fg" : "fg",
    selectedSuffixText: selectedOptionSuffixText,
    hasSelectedSuffixText: selectedOptionSuffixText.length > 0,
    selectedSuffixTextColor: "mu-fg",
    selectButtonCursor: isDisabled ? "not-allowed" : "pointer",
    selectButtonHoverBorderColor: isDisabled ? "bo" : "ac",
    selectButtonTabIndex: isDisabled ? -1 : 0,
    hasValue: currentValue !== null && currentValue !== undefined,
    showClear: !isDisabled && !props.noClear && (currentValue !== null && currentValue !== undefined),
    showAddOption: !isDisabled && !!props.addOption,
    addOptionLabel: props.addOption?.label ? `+ ${props.addOption.label}` : "+ Add",
    addOptionBgc: state.hoveredAddOption ? "ac" : "",
    showSearch: !isDisabled && !!props.searchable,
    searchQuery: normalizedSearchQuery,
    searchPlaceholder: props.searchPlaceholder || "Search options",
    showEmptySearch: !!props.searchable && normalizedSearchQuery.length > 0 && !hasVisibleSelectableOptions,
    emptySearchLabel: props.emptySearchLabel || "No matching options",
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
  state.searchQuery = "";
  // Set hoveredOptionId to the selected option's index if available
  if (selectedIndex !== undefined && selectedIndex !== null) {
    state.hoveredOptionId = selectedIndex;
  }
};

export const closeOptionsPopover = ({ state }) => {
  state.isOpen = false;
  state.searchQuery = "";
};

export const updateSelectedValue = ({ state }, payload = {}) => {
  state.selectedValue = payload.value;
  state.isOpen = false;
  state.searchQuery = "";
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

export const setSearchQuery = ({ state }, payload = {}) => {
  state.searchQuery = payload.query === undefined || payload.query === null
    ? ""
    : String(payload.query);
  state.hoveredOptionId = null;
};
