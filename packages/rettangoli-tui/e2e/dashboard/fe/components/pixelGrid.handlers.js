export const handlePaintCell = (deps, payload) => {
  const { _event: event } = payload;
  const id = event.currentTarget.dataset.cellId;
  if (id !== undefined) {
    deps.store.paintCell({ id });
    deps.render();
  }
};

export const handleSelectColor = (deps, payload) => {
  const { _event: event } = payload;
  const color = event.currentTarget.dataset.swatchColor;
  if (color) {
    deps.store.selectColor({ color });
    deps.render();
  }
};

export const handleClear = (deps) => {
  deps.store.clearAll({});
  deps.render();
};
