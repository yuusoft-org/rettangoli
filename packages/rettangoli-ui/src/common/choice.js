// Helpers shared by the choice controls: rtgl-select, rtgl-tag-select,
// rtgl-segmented-control, rtgl-dropdown-menu and the global-ui dropdown.

// Options are items unless they are a "section" or "separator" row.
export const getOptionType = (option = {}) => {
  if (option.type === "section") {
    return "section";
  }

  if (option.type === "separator") {
    return "separator";
  }

  return "item";
};

export const isSelectableOption = (option = {}) => getOptionType(option) === "item";

export const getOptionIcon = (option = {}) => {
  return typeof option.icon === "string" && option.icon.length > 0 ? option.icon : "";
};

export const getOptionImageSrc = (option = {}) => {
  return typeof option.imageSrc === "string" && option.imageSrc.trim().length > 0
    ? option.imageSrc
    : "";
};

// `shortcut` wins over `suffixText`; both must be non-empty strings.
export const getOptionSuffixText = (option = {}) => {
  if (typeof option.shortcut === "string" && option.shortcut.length > 0) {
    return option.shortcut;
  }

  if (typeof option.suffixText === "string" && option.suffixText.length > 0) {
    return option.suffixText;
  }

  return "";
};

// A copy of the array, or [] for anything that is not an array.
export const normalizeSelectedValues = (selectedValues) => {
  if (!Array.isArray(selectedValues)) {
    return [];
  }

  return [...selectedValues];
};

// rtgl-tag-select's current values: the store's copy once it has one
// (handleBeforeMount and handleOnUpdate copy the `selectedValues` prop into the
// store, and saving the popover commits the draft), else a copy of the
// `selectedValues` prop. Takes the element (methods) or the handler deps; both
// carry `store` and `props`.
export const resolveCurrentValues = ({ store, props }) => {
  if (store?.selectHasSelectedValues?.()) {
    return store?.selectSelectedValues?.() || [];
  }

  return normalizeSelectedValues(props?.selectedValues);
};

// Where the tag-select popover opens, below its trigger. Without a measurable
// trigger it returns `fallback`: handlers pass none, so undefined; methods
// pass null.
export const resolvePopoverPosition = (trigger, fallback) => {
  if (!trigger || typeof trigger.getBoundingClientRect !== "function") {
    return fallback;
  }

  const rect = trigger.getBoundingClientRect();
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.bottom + 12),
    w: Math.max(Math.round(rect.width), 240),
  };
};

// rtgl-select and rtgl-segmented-control show their `selectedValue` prop.
// While that prop is undefined they show the user's own pick or clear
// (`state.hasLocalValue`), so they also work without a parent that echoes
// value-change. A defined prop, null included, always wins.
const isLocalSelection = ({ state, props }) =>
  props?.selectedValue === undefined && state.hasLocalValue === true;

export const resolveSelectedValue = ({ state, props }) =>
  isLocalSelection({ state, props }) ? state.selectedValue : props?.selectedValue;

// Whether a segmented control shows a value at all, so that an option whose
// value is undefined is pressed only once it is picked, not in the empty state.
export const hasResolvedValue = ({ state, props }) =>
  isLocalSelection({ state, props })
    ? state.hasSelectedValue === true
    : props?.selectedValue !== undefined;

// The overlay and breakpoint placement props that rtgl-dropdown-menu passes
// to its rtgl-popover, as [propName, attrName].
export const DROPDOWN_POPOVER_ATTR_PROPS = [
  ["overlay", "overlay"],
  ["noOverlay", "no-overlay"],
  ["smPlace", "sm-place"],
  ["mdPlace", "md-place"],
  ["lgPlace", "lg-place"],
  ["xlPlace", "xl-place"],
  ["smOverlay", "sm-overlay"],
  ["mdOverlay", "md-overlay"],
  ["lgOverlay", "lg-overlay"],
  ["xlOverlay", "xl-overlay"],
  ["smNoOverlay", "sm-no-overlay"],
  ["mdNoOverlay", "md-no-overlay"],
  ["lgNoOverlay", "lg-no-overlay"],
  ["xlNoOverlay", "xl-no-overlay"],
];

const escapeAttrValue = (value) => `${value}`.replace(/"/g, "&quot;");

// The popover attributes for the defined (non-null) props in `attrProps`:
// `true` becomes a bare attribute, anything else `attr="value"`.
export const stringifyPopoverAttrs = (source = {}, attrProps = DROPDOWN_POPOVER_ATTR_PROPS) => {
  return attrProps
    .filter(([propName]) => source[propName] !== undefined && source[propName] !== null)
    .map(([propName, attrName]) => {
      const value = source[propName];

      if (value === true) {
        return attrName;
      }

      return `${attrName}="${escapeAttrValue(value)}"`;
    })
    .join(" ");
};
