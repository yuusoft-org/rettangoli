
export const handleClosePopover = (deps, payload) => {
  const { dispatchEvent } = deps;
  dispatchEvent(new CustomEvent('close'));
}

export const handleClickMenuItem = (deps, payload) => {
  const { dispatchEvent } = deps;
  const event = payload._event;
  const index = parseInt(event.currentTarget.id.replace('option-', ''));
  const item = deps.props.items[index];

  dispatchEvent(new CustomEvent('click-item', {
    detail: {
      index,
      item
    }
  }));
}
