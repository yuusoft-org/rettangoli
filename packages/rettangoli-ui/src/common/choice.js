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
