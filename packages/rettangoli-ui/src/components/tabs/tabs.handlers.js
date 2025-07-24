export const handleClickItem = (e, deps) => {
  const { dispatchEvent } = deps;
  const id = e.currentTarget.dataset.id;
  
  dispatchEvent(new CustomEvent('item-click', {
    detail: {
      id
    }
  }));
}