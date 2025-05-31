
export const handleClickOverlay = (e, { store, render }) => {
  store.setClose();
  render();
}

export const open = (payload, deps) => {
  const { position } = payload;
  const { store, render } = deps;

  store.setOpen(position);
  render();
}

