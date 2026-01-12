export const handleClickHeader = (deps, payload) => {
  const { store, render } = deps;
  store.toggleOpen();
  render();
};
