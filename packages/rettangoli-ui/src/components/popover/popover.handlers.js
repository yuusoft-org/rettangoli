export const handleClickOverlay = (e, deps) => {
  const { props, dispatchEvent, store, render } = deps;
  if (props.isOpen !== undefined) {
    dispatchEvent(new CustomEvent('closePopover'));
    return;
  }
  store.setClose();
  render();
}

export const open = (payload, deps) => {
  const { position } = payload;
  const { store, render } = deps;
  store.setOpen(position);
  render();
}

