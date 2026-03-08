const blacklistedProps = [
  'id',
  'class',
  'style',
  'slot',
  'heading',
  'subheading',
  'size',
  'd',
  'ah',
  'av',
  'wrap',
  'noWrap',
  'g',
  'gh',
  'gv',
  'p',
  'pt',
  'pr',
  'pb',
  'pl',
  'pv',
  'ph',
  'bw',
  'bwt',
  'bwr',
  'bwb',
  'bwl',
  'bc',
  'br',
  'shadow',
  'bgc',
  'href',
  'newTab',
  'rel',
  'cur',
  'sv',
  'sh',
  'overflow',
];

const sizePresets = {
  sm: {
    cardAttrString: 'p=md sm-p=sm g=md sm-g=sm',
    headerAttrString: 'g=xs',
    headingSize: 'lg',
    subheadingSize: 'sm',
  },
  md: {
    cardAttrString: 'p=lg md-p=md sm-p=md g=lg md-g=md sm-g=md',
    headerAttrString: 'g=sm',
    headingSize: 'h4',
    subheadingSize: 'sm',
  },
  lg: {
    cardAttrString: 'p=xl lg-p=lg md-p=md sm-p=md g=lg md-g=md sm-g=md',
    headerAttrString: 'g=sm',
    headingSize: 'h3',
    subheadingSize: 'md',
  },
};

const stringifyProps = (props = {}) => {
  return Object.entries(props)
    .filter(([key]) => !blacklistedProps.includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
};

export const createInitialState = () => Object.freeze({});

export const selectViewData = ({ props = {} }) => {
  const size = sizePresets[props.size] ? props.size : 'md';
  const preset = sizePresets[size];

  return {
    containerAttrString: stringifyProps(props),
    cardAttrString: preset.cardAttrString,
    headerAttrString: preset.headerAttrString,
    headingSize: preset.headingSize,
    subheadingSize: preset.subheadingSize,
    heading: props.heading || '',
    subheading: props.subheading || '',
    hasHeader: !!(props.heading || props.subheading),
    size,
  };
};
