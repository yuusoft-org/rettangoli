
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
    const suffixTextValue = typeof item.shortcut === 'string' && item.shortcut.length > 0
      ? item.shortcut
      : (typeof item.suffixText === 'string' && item.suffixText.length > 0 ? item.suffixText : '');
    const c = isDisabled ? 'mu-fg' : 'fg';
    const bgc = isDisabled ? 'mu' : '';
    const hoverBgc = isDisabled ? '' : 'ac';
    const iconColor = c;
    const suffixTextColor = 'mu-fg';
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
      suffixText: suffixTextValue,
      hasSuffixText: suffixTextValue.length > 0,
      hasHref,
      linkExtraAttrs,
      c,
      bgc,
      hoverBgc,
      iconColor,
      suffixTextColor,
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
