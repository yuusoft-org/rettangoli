export const createInitialState = () => Object.freeze({
  open: false
});

const blacklistedAttrs = ['id', 'class', 'style', 'slot', 'label', 'content'];

const stringifyAttrs = (props = {}) => {
  return Object.entries(props)
    .filter(([key]) => !blacklistedAttrs.includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
};

export const selectViewData = ({ state, props }) => {
  return {
    label: props.label || '',
    content: props.content || '',
    openClass: state.open ? 'content-wrapper open' : 'content-wrapper',
    chevronIcon: state.open ? 'chevronUp' : 'chevronDown',
    containerAttrString: stringifyAttrs(props),
  };
};

export const toggleOpen = ({ state }) => {
  state.open = !state.open;
};
