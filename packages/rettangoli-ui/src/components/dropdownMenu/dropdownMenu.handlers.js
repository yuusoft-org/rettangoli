
export const handleClosePopover = (deps, payload) => {
  const { dispatchEvent } = deps;
  dispatchEvent(new CustomEvent('close'));
}

export const handleClickMenuItem = (deps, payload) => {
  const { dispatchEvent, props } = deps;
  const event = payload._event;
  const index = Number(event.currentTarget.dataset.index ?? event.currentTarget.id.slice('option'.length));
  const item = props.items[index];
  const itemType = item?.type || 'item';

  if (!item || itemType !== 'item' || item.disabled) {
    event.preventDefault();
    return;
  }

  if (!item.href) {
    event.preventDefault();
  }

  dispatchEvent(new CustomEvent('item-click', {
    detail: {
      index,
      item,
      id: item.id,
      path: item.path,
      href: item.href,
      trigger: event.type,
    }
  }));
}
