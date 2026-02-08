export const handleClickItem = (deps, payload) => {
  const { dispatchEvent, props } = deps;
  const event = payload._event;
  const index = Number(event.currentTarget.dataset.index);
  const item = Array.isArray(props.items) ? props.items[index] : undefined;

  if (!item) {
    return;
  }

  if (item.disabled || item.current) {
    event.preventDefault();
    return;
  }

  const hasHref = typeof item.href === 'string' && item.href.length > 0;
  if (!hasHref) {
    event.preventDefault();
  }

  dispatchEvent(new CustomEvent('item-click', {
    detail: {
      id: item.id,
      path: item.path,
      href: item.href,
      item,
      index,
      trigger: event.type,
    }
  }));
}
