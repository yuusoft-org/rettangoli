export const handleDocumentKeydown = (deps, payload) => {
  const { _event: event } = payload;
  if (event.key === 'r' || event.key === 'R') {
    deps.store.incrementReset({});
    deps.render();
  }
};
