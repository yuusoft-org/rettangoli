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
      icon: item.icon,
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
          icon: subItem.icon,
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
  const mode = attrs.mode || 'full';
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

  // Computed values based on mode
  const sidebarWidth = mode === 'full' ? 272 : 64;
  const headerAlign = mode === 'full' ? 'fs' : 'c';
  const itemAlign = mode === 'full' ? 'fs' : 'c';
  const headerPadding = mode === 'full' ? 'lg' : 'sm';
  const itemPadding = mode === 'full' ? 'md' : 'sm';
  const itemHeight = mode === 'shrunk-lg' ? 48 : 40;
  const iconSize = mode === 'shrunk-lg' ? 28 : 20;
  const firstLetterSize = mode === 'shrunk-lg' ? 'md' : 'sm';
  const showLabels = mode === 'full';
  const showGroupLabels = mode === 'full';
  
  // For items with icons in full mode, we need left alignment within the container
  // but the container itself should use flex-start alignment
  const itemContentAlign = mode === 'full' ? 'fs' : 'c';
  
  // Item container alignment - only set for shrunk modes, leave default for full mode
  const itemAlignAttr = mode === 'full' ? '' : `ah=${itemAlign}`;
  
  // Item width - for shrunk modes, make it square to constrain the highlight
  const itemWidth = mode === 'full' ? 'f' : itemHeight;
  
  // Header width - should match item width for alignment
  const headerWidth = itemWidth;

  return {
    containerAttrString,
    mode,
    header,
    items,
    sidebarWidth,
    headerAlign,
    itemAlign,
    headerPadding,
    itemPadding,
    itemHeight,
    iconSize,
    firstLetterSize,
    showLabels,
    showGroupLabels,
    itemContentAlign,
    itemAlignAttr,
    itemWidth,
    headerWidth
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