
export const handleClickPopoverOverlay = (e, deps) => {
  const { dispatchEvent } = deps;
  dispatchEvent(new CustomEvent('click-overlay'));
}