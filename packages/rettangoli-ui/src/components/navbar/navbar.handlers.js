
export const handleClickStart = (deps, payload) => {
  const { dispatchEvent, store } = deps;
  const event = payload._event;
  console.log('handle click start', store.selectPath());
  dispatchEvent(new CustomEvent('start-click', {
    detail: {
      path: store.selectPath(),
    }
  }));
}
