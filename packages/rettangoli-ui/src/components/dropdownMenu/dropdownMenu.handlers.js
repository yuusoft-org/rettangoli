
export const handleClosePopover = (e, deps) => {
  const { dispatchEvent } = deps;
  dispatchEvent(new CustomEvent('close'));
}

export const handleClickMenuItem = (e, deps) => {
  const { dispatchEvent } = deps;
  const index = parseInt(e.currentTarget.id.replace('option-', ''));
  const item = deps.props.items[index];

  dispatchEvent(new CustomEvent('click-item', {
    detail: {
      index,
      item
    }
  }));
}
