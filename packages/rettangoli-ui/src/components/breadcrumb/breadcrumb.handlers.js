export const handleClickItem = (deps, event) => {
  const { dispatchEvent } = deps;
  const id = event.currentTarget.dataset.id;
  dispatchEvent(new CustomEvent('item-click', {
    detail: {
      id
    }
  }));
}
