export const createInitialState = () => Object.freeze({});

const blacklistedAttrs = ['id', 'class', 'style', 'slot', 'items', 'sep', 'max', 'separator'];

const stringifyAttrs = (props = {}) => {
  return Object.entries(props).filter(([key]) => !blacklistedAttrs.includes(key)).map(([key, value]) => `${key}=${value}`).join(' ');
}

const toNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const collapseItems = (items, max) => {
  if (!max || max < 3 || items.length <= max) {
    return items;
  }

  const tailCount = max - 2;
  return [
    items[0],
    { isEllipsis: true, label: '...' },
    ...items.slice(-tailCount),
  ];
};

const normalizeItems = (items) => {
  return items.map((item, index) => {
    const hasHref = typeof item.href === 'string' && item.href.length > 0;
    const hasPath = item.path !== undefined && item.path !== null && `${item.path}` !== '';
    const isCurrent = !!item.current;
    const isDisabled = !!item.disabled;
    const isInteractive = !isCurrent && !isDisabled && (hasHref || hasPath || !!item.click);
    const linkExtraAttrs = [
      item.target ? `target=${item.target}` : '',
      item.rel ? `rel=${item.rel}` : '',
    ].filter(Boolean).join(' ');

    return {
      ...item,
      label: item.label || '',
      index,
      href: hasHref ? item.href : undefined,
      path: hasPath ? item.path : undefined,
      isCurrent,
      isDisabled,
      isInteractive,
      linkExtraAttrs,
      c: isCurrent ? 'fg' : 'mu-fg',
    };
  });
};

export const selectViewData = ({ props }) => {
  const containerAttrString = stringifyAttrs(props);

  const items = Array.isArray(props.items) ? props.items : [];
  const max = toNumber(props.max);
  const sep = props.sep || 'breadcrumb-arrow';

  const normalizedItems = normalizeItems(items);
  const collapsedItems = collapseItems(normalizedItems, max);

  // Add separators between items, but not after the last one
  const itemsWithSeparators = [];
  collapsedItems.forEach((item, index) => {
    itemsWithSeparators.push(item);
    if (index < collapsedItems.length - 1) {
      itemsWithSeparators.push({ isSeparator: true });
    }
  });

  return {
    containerAttrString,
    items: itemsWithSeparators,
    sep
  };
}
