export const handleCountChanged = (deps) => {
  deps.store.incrementClicks({});
  deps.render();
};

export const handleDocumentKeydown = (deps, payload) => {
  const { _event: event } = payload;
  if (event.key === 'Escape') {
    deps.store.toggleEsc({});
    deps.render();
  }
};
