
export const createInitialState = () => Object.freeze({
});

const escapeAttrValue = (value) => `${value}`.replace(/"/g, '&quot;');

const normalizeItems = (items) => {
  return items.map((item, index) => {
    const type = item.type || 'item';
    const isSeparator = type === 'separator';
    const isLabel = type === 'label';
    const isItem = type === 'item';
    const isDisabled = !!item.disabled;
    const isInteractive = isItem && !isDisabled;
    const hasIconSlot = Object.prototype.hasOwnProperty.call(item, 'icon');
    const icon = typeof item.icon === 'string' && item.icon.length > 0 ? item.icon : '';
    const rightTextValue = typeof item.shortcut === 'string' && item.shortcut.length > 0
      ? item.shortcut
      : (typeof item.rightText === 'string' && item.rightText.length > 0 ? item.rightText : '');
    const c = isDisabled ? 'mu-fg' : 'fg';
    const bgc = isDisabled ? 'mu' : '';
    const hoverBgc = isDisabled ? '' : 'ac';
    const iconColor = c;
    const rightTextColor = 'mu-fg';
    const hasHref = typeof item.href === 'string' && item.href.length > 0;
    const relValue = item.rel || (item.newTab ? 'noopener noreferrer' : '');
    const linkExtraAttrs = [
      item.newTab ? 'target="_blank"' : '',
      relValue ? `rel="${escapeAttrValue(relValue)}"` : '',
    ].filter(Boolean).join(' ');

    return {
      ...item,
      index,
      type,
      isSeparator,
      isLabel,
      isItem,
      isDisabled,
      isInteractive,
      hasIconSlot,
      icon,
      hasIcon: icon.length > 0,
      rightText: rightTextValue,
      hasRightText: rightTextValue.length > 0,
      hasHref,
      linkExtraAttrs,
      c,
      bgc,
      hoverBgc,
      iconColor,
      rightTextColor,
    };
  });
};

export const selectViewData = ({ props }) => {
  const items = Array.isArray(props.items) ? props.items : [];

  return {
    items: normalizeItems(items),
    open: !!props.open,
    x: props.x || 0,
    y: props.y || 0,
    w: props.w || '300',
    h: props.h || '300',
    place: props.place || 'bs',
  };
}
