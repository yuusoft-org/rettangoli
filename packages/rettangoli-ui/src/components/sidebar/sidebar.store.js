export const createInitialState = () => Object.freeze({});

const blacklistedAttrs = ['id', 'class', 'style', 'slot', 'header', 'items', 'selectedItemId', 'mode'];

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

function flattenItems(items, selectedItemId = null) {
  let result = [];

  for (const item of items) {
    const itemId = item.id || item.href || item.path;
    const isSelected = selectedItemId === itemId;

    // Add the parent item if it's not just a group label
    result.push({
      id: itemId,
      title: item.title,
      href: item.href,
      type: item.type || 'item',
      icon: item.icon,
      hrefAttr: item.href ? `href=${item.href}` : '',
      isSelected,
      itemBgc: isSelected ? 'ac' : 'bg',
      itemHoverBgc: isSelected ? 'ac' : 'mu',
    });

    // Add child items if they exist
    if (item.items && Array.isArray(item.items)) {
      for (const subItem of item.items) {
        const subItemId = subItem.id || subItem.href || subItem.path;
        const isSubSelected = selectedItemId === subItemId;

        result.push({
          id: subItemId,
          title: subItem.title,
          href: subItem.href,
          type: subItem.type || 'item',
          icon: subItem.icon,
          hrefAttr: subItem.href ? `href=${subItem.href}` : '',
          isSelected: isSubSelected,
          itemBgc: isSubSelected ? 'ac' : 'bg',
          itemHoverBgc: isSubSelected ? 'ac' : 'mu',
        });
      }
    }
  }

  return result;
}

export const selectViewData = ({ props }) => {
  const resolvedHeader = parseMaybeEncodedJson(props.header) || props.header;
  const resolvedItems = parseMaybeEncodedJson(props.items) || props.items;
  const selectedItemId = props.selectedItemId;

  const containerAttrString = stringifyAttrs(props);
  const mode = props.mode || 'full';
  const header = resolvedHeader || {
    label: '',
    path: '',
    image: {
      src: '',
      alt: '',
      width: 0,
      height: 0,
    },
  };

  const items = resolvedItems ? flattenItems(resolvedItems, selectedItemId) : [];

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

  const ah = mode === 'shrunk-lg' || mode === 'shrunk-md' ? 'c' : '';

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
    headerWidth,
    selectedItemId,
    ah,
  };
}

export const selectHeader = ({ props }) => {
  return parseMaybeEncodedJson(props.header) || props.header;
};

export const selectActiveItem = ({ state, props }) => {
  const resolvedItems = parseMaybeEncodedJson(props.items) || props.items;
  const items = resolvedItems ? flattenItems(resolvedItems) : [];
  return items.find(item => item.active);
};

export const selectItem = ({ props }, id) => {
  const resolvedItems = parseMaybeEncodedJson(props.items) || props.items;
  const items = resolvedItems ? flattenItems(resolvedItems) : [];
  return items.find(item => item.id === id);
};

export const setState = ({ state }) => {
  // State management if needed
};
