export const INITIAL_STATE = Object.freeze({});

const blacklistedAttrs = ['id', 'class', 'style', 'slot'];

const stringifyAttrs = (attrs) => {
  return Object.entries(attrs).filter(([key]) => !blacklistedAttrs.includes(key)).map(([key, value]) => `${key}=${value}`).join(' ');
}

export const toViewData = ({ props, attrs }) => {
  const containerAttrString = stringifyAttrs(attrs);

  const items = props.items || [];
  const separator = props.separator || 'breadcrumb-arrow';

  // Add separators between items, but not after the last one
  const itemsWithSeparators = [];
  items.forEach((item, index) => {
    itemsWithSeparators.push(item);
    if (index < items.length - 1) {
      itemsWithSeparators.push({ isSeparator: true });
    }
  });

  return {
    containerAttrString,
    items: itemsWithSeparators,
    separator
  };
}
