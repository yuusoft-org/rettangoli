export const INITIAL_STATE = Object.freeze({});

const blacklistedAttrs = ['id', 'class', 'style', 'slot'];

const stringifyAttrs = (attrs) => {
  return Object.entries(attrs).filter(([key]) => !blacklistedAttrs.includes(key)).map(([key, value]) => `${key}=${value}`).join(' ');
}

export const toViewData = ({ state, props, attrs }) => {
  console.log('attrs', {
    attrs,
    entries: Object.entries(attrs)
  })
  const containerAttrString = stringifyAttrs(attrs);
  const start = props.start || {
    label: '',
    // href: undefined,
    // path: undefined,
    image: {
      src: '',
      width: 32,
      height: 32,
      alt: ''
    }
  }
  // start.hasImage = start.image && start.image.src;
  // start.hasHref = !!start.href;
  return {
    containerAttrString,
    start
  };
}

export const selectPath = ({ props }) => {
  return props.start.path;
}

export const setState = (state) => {
  // do doSomething
}



