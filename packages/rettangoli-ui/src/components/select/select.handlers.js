
export const handleOnMount = (deps) => {
}

export const handleButtonClick = (e, deps) => {
  const { store, render, getRefIds } = deps;
  const refIds = getRefIds();
  refIds.popover.elm.transformedHandlers.open({
    position: {
      x: e.clientX,
      y: e.clientY
    }
  });

}
