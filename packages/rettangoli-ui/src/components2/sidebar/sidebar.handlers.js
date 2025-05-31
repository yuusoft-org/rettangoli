export const handleHeaderClick = (e, deps) => {
  const { store, dispatchEvent } = deps;

  let path;

  const header = store.selectHeader();

  if (e.currentTarget.id === 'header-label') {
    path = header.labelPath;
  } else if (e.currentTarget.id === 'header-image') {
    path = header.image.path;
  } else if (e.currentTarget.id === 'header') {
    path = header.path;
  }

  dispatchEvent(new CustomEvent('headerClick', {
    detail: {
      path
    },
    bubbles: true,
    composed: true
  }));
}

export const handleItemClick = (e, deps) => {
  const { store, dispatchEvent } = deps;
  const id = e.currentTarget.id.replace('item-', '');
  const item = store.selectItem(id);
  dispatchEvent(new CustomEvent('itemClick', {
    detail: {
      item,
    },
    bubbles: true,
    composed: true
  }));
}
