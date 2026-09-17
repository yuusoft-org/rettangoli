export const createInitialState = () => Object.freeze({ focusedTab: null });

export const setFocusedTab = ({ state }, { id }) => {
  state.focusedTab = id;
};

const blacklistedProps = ["id", "class", "style", "slot", "items", "selectedTab", "s", "ariaLabel"];

const stringifyProps = (props = {}) => {
  return Object.entries(props)
    .filter(([key]) => !blacklistedProps.includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
};

export const selectViewData = ({ state = {}, props = {} }) => {
  const containerAttrString = stringifyProps(props);
  const size = ["sm", "md", "lg"].includes(props.s) ? props.s : "md";

  const items = props.items || [];
  const selectedTab = props.selectedTab;
  const tabStop = items.find((item) => item.id === state.focusedTab)
    ?? items.find((item) => item.id === selectedTab)
    ?? items[0];

  // Mark selected tab with styling
  const itemsWithSelection = items.map((item) => ({
    ...item,
    isSelected: item.id === selectedTab,
    tabIndex: item === tabStop ? 0 : -1,
    bgColor: item.id === selectedTab ? 'ac' : '',
    borderColor: item.id === selectedTab ? '' : 'tr',
    textColor: item.id === selectedTab ? '' : 'mu-fg'
  }));

  return {
    ariaLabel: props.ariaLabel ?? "Tabs",
    size,
    containerAttrString,
    items: itemsWithSelection,
    selectedTab,
  };
};
