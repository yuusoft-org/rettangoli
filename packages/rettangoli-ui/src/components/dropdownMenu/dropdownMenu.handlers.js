
export const handleClosePopover = (deps, payload) => {
  const { dispatchEvent } = deps;
  dispatchEvent(new CustomEvent('close'));
}

export const handleClickMenuItem = (deps, payload) => {
  const { dispatchEvent, props } = deps;
  const event = payload._event;
  const index = parseInt(event.currentTarget.id.replace('option-', ''));
  const item = props.items[index];

  dispatchEvent(new CustomEvent('item-click', {
    detail: {
      index,
      item
    }
  }));
}
