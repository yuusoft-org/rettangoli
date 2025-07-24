export const INITIAL_STATE = Object.freeze({});

const blacklistedAttrs = ['id', 'class', 'style', 'slot'];

const stringifyAttrs = (attrs) => {
  return Object.entries(attrs).filter(([key]) => !blacklistedAttrs.includes(key)).map(([key, value]) => `${key}=${value}`).join(' ');
}

export const toViewData = ({ state, props, attrs }) => {
  const containerAttrString = stringifyAttrs(attrs);

  const items = props.items || [];
  const selectedTab = attrs['selected-tab'];

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
    selectedTab
  };
}
