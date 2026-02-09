export const createInitialState = () => Object.freeze({});

const blacklistedProps = ["id", "class", "style", "slot", "items", "selectedTab"];

const stringifyProps = (props = {}) => {
  return Object.entries(props)
    .filter(([key]) => !blacklistedProps.includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
};

export const selectViewData = ({ props }) => {
  const containerAttrString = stringifyProps(props);

  const items = props.items || [];
  const selectedTab = props.selectedTab;

  // Mark selected tab with styling
  const itemsWithSelection = items.map(item => ({
    ...item,
    isSelected: item.id === selectedTab,
    bgColor: item.id === selectedTab ? 'ac' : '',
    borderColor: item.id === selectedTab ? '' : 'tr',
    textColor: item.id === selectedTab ? '' : 'mu-fg'
  }));

  return {
    containerAttrString,
    items: itemsWithSelection,
    selectedTab,
  };
};
