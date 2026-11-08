
export const handleClickStart = (deps, payload) => {
  const { dispatchEvent, store } = deps;
  const event = payload._event;
  dispatchEvent(new CustomEvent('start-click', {
    detail: {
      path: store.selectPath(),
    }
  }));
}
