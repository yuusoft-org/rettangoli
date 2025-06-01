
export const handleClickStart = (e, deps) => {
  const { dispatchEvent, store } = deps;
  console.log('handle click start', store.selectPath());
  dispatchEvent(new CustomEvent('clickStart', {
    detail: {
      path: store.selectPath(),
    }
  }));
}
