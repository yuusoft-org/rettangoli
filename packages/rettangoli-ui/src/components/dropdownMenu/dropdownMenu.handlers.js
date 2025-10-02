
export const handleClosePopover = (deps, event) => {
  const { dispatchEvent } = deps;
  dispatchEvent(new CustomEvent('close'));
}

export const handleClickMenuItem = (deps, event) => {
  const { dispatchEvent } = deps;
  const index = parseInt(event.currentTarget.id.replace('option-', ''));
  const item = deps.props.items[index];

  dispatchEvent(new CustomEvent('click-item', {
    detail: {
      index,
      item
    }
  }));
}
