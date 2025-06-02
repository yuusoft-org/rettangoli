
export const handleClickDialogueOverlay = (e, deps) => {
  const { dispatchEvent } = deps;
  dispatchEvent(new CustomEvent('close-dialogue'));
}
