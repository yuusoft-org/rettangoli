export const handleClickItem = (deps, payload) => {
  const { dispatchEvent } = deps;
  const event = payload._event;
  const id = event.currentTarget.dataset.id;

  dispatchEvent(new CustomEvent('item-click', {
    detail: {
      id
    }
  }));
}