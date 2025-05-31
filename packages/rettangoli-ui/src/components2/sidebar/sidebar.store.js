export const INITIAL_STATE = Object.freeze({});

const blacklistedAttrs = ['id', 'class', 'style', 'slot'];

const stringifyAttrs = (attrs) => {
  return Object.entries(attrs).filter(([key]) => !blacklistedAttrs.includes(key)).map(([key, value]) => `${key}=${value}`).join(' ');
}

function flattenItems(items) {
  let result = [];

  for (const item of items) {
    // Add the parent item if it's not just a group label
    result.push({
      id: item.id || item.href || item.path,
      title: item.title,
      href: item.href,
      type: item.type || 'item',
      hrefAttr: item.href ? `href=${item.href}` : '',
    });

    // Add child items if they exist
    if (item.items && Array.isArray(item.items)) {
      for (const subItem of item.items) {
        result.push({
          id: subItem.id || subItem.href || subItem.path,
          title: subItem.title,
          href: subItem.href,
          type: subItem.type || 'item',
          hrefAttr: subItem.href ? `href=${subItem.href}` : '',
        });
      }
    }
  }

  return result;
}

export const toViewData = ({ state, props, attrs }) => {
  const attrsHeader = attrs.header ? JSON.parse(decodeURIComponent(attrs.header)) : props.header;
  const attrsItems = attrs.items ? JSON.parse(decodeURIComponent(attrs.items)) : props.items;

  const containerAttrString = stringifyAttrs(attrs);
  const header = attrsHeader || {
    label: '',
    path: '',
    image: {
      src: '',
      alt: '',
      width: 0,
      height: 0,
    },
  };

  const items = attrsItems ? flattenItems(attrsItems) : [];

  return {
    containerAttrString,
    header,
    items
  };
}

export const selectHeader = ({ state, props, attrs }) => {
  const attrsHeader = attrs.header ? JSON.parse(decodeURIComponent(attrs.header)) : props.header;
  return attrsHeader;
}

export const selectActiveItem = ({ state, props }) => {
  const items = props.items ? flattenItems(props.items) : [];
  return items.find(item => item.active);
}

export const selectItem = ({ state, props, attrs }, id) => {
  const attrsItems = attrs.items ? JSON.parse(decodeURIComponent(attrs.items)) : props.items;
  const items = attrsItems ? flattenItems(attrsItems) : [];
  return items.find(item => item.id === id);
}

export const setState = (state) => {
  // State management if needed
}