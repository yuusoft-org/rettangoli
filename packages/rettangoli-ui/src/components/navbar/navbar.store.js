export const createInitialState = () => Object.freeze({});

const blacklistedAttrs = ['id', 'class', 'style', 'slot', 'start'];

const stringifyAttrs = (props = {}) => {
  return Object.entries(props).filter(([key]) => !blacklistedAttrs.includes(key)).map(([key, value]) => `${key}=${value}`).join(' ');
}

const parseMaybeEncodedJson = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "object") {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
};

export const selectViewData = ({ props }) => {
  const attrsStart = parseMaybeEncodedJson(props.start) || props.start;

  const containerAttrString = stringifyAttrs(props);
  const start = attrsStart || {
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
  return props.start?.path;
}

export const setState = ({ state }) => {
  // do doSomething
}

