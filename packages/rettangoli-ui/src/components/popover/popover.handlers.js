
export const handleClickOverlay = (e, deps) => {
  const { dispatchEvent } = deps;
  dispatchEvent(new CustomEvent('click-overlay'));
}
