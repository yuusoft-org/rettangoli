export const createInitialState = () => Object.freeze({});

const blacklistedProps = ["id", "class", "style", "slot", "items", "selectedTab", "s", "ariaLabel"];

const stringifyProps = (props = {}) => {
  return Object.entries(props)
    .filter(([key]) => !blacklistedProps.includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
};

export const selectViewData = ({ props = {} }) => {
  const containerAttrString = stringifyProps(props);
  const size = ["sm", "md", "lg"].includes(props.s) ? props.s : "md";

  const items = props.items || [];
  const selectedTab = props.selectedTab;

  // Mark selected tab with styling
  const itemsWithSelection = items.map((item, index) => ({
    ...item,
    isSelected: item.id === selectedTab,
    tabIndex: item.id === selectedTab || (!items.some(tab => tab.id === selectedTab) && index === 0) ? 0 : -1,
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
