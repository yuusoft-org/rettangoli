export const handleHeaderClick = (deps, payload) => {
  const { store, dispatchEvent } = deps;
  const event = payload._event;

  let path;

  const header = store.selectHeader();

  if (event.currentTarget.id === 'headerLabel') {
    path = header.labelPath;
  } else if (event.currentTarget.id === 'headerImage') {
    path = header.image.path;
  } else if (event.currentTarget.id === 'header') {
    path = header.path;
  }

  dispatchEvent(new CustomEvent('header-click', {
    detail: {
      path
    },
    bubbles: true,
    composed: true
  }));
}

export const handleItemClick = (deps, payload) => {
  const { store, dispatchEvent } = deps;
  const event = payload._event;
  const id = event.currentTarget.dataset.itemId || event.currentTarget.id.slice('item'.length);
  const item = store.selectItem(id);
  dispatchEvent(new CustomEvent('item-click', {
    detail: {
      item,
    },
    bubbles: true,
    composed: true
  }));
}
