export const handleClear = (deps) => {
  deps.store.clearItems();
  deps.render();
};
