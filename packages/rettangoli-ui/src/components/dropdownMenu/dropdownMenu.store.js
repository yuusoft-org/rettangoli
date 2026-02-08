
export const createInitialState = () => Object.freeze({
});

const normalizeItems = (items) => {
  return items.map((item, index) => {
    const type = item.type || 'item';
    const isSeparator = type === 'separator';
    const isLabel = type === 'label';
    const isItem = type === 'item';
    const isDisabled = !!item.disabled;
    const isInteractive = isItem && !isDisabled;
    const c = isDisabled ? 'mu-fg' : 'fg';
    const bgc = isDisabled ? 'mu' : 'mu';
    const hoverBgc = isDisabled ? '' : 'ac';
    const hasHref = typeof item.href === 'string' && item.href.length > 0;
    const linkExtraAttrs = [
      item.target ? `target=${item.target}` : '',
      item.rel ? `rel=${item.rel}` : '',
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
      hasHref,
      linkExtraAttrs,
      c,
      bgc,
      hoverBgc,
    };
  });
};

export const selectViewData = ({ props, attrs }) => {
  const items = Array.isArray(props.items) ? props.items : [];

  return {
    items: normalizeItems(items),
    open: !!attrs.open,
    x: attrs.x || 0,
    y: attrs.y || 0,
    w: attrs.w || '300',
    h: attrs.h || '300',
    placement: attrs.placement || 'bottom-start',
  };
}
