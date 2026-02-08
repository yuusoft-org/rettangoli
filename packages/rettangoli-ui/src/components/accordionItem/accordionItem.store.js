export const createInitialState = () => Object.freeze({
  open: false
});

const blacklistedAttrs = ['id', 'class', 'style', 'slot', 'label', 'content'];

const stringifyAttrs = (attrs) => {
  return Object.entries(attrs)
    .filter(([key]) => !blacklistedAttrs.includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
};

export const selectViewData = ({ state, props, attrs }) => {
  return {
    label: attrs['label'] || '',
    content: attrs['content'] || '',
    openClass: state.open ? 'content-wrapper open' : 'content-wrapper',
    chevronIcon: state.open ? 'chevronUp' : 'chevronDown',
    containerAttrString: stringifyAttrs(attrs)
  };
};

export const toggleOpen = (state) => {
  state.open = !state.open;
};
