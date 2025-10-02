
export const createInitialState = () => Object.freeze({
});

export const selectViewData = ({ props, attrs }) => {
  return {
    items: props.items || [],
    open: !!attrs.open,
    x: attrs.x,
    y: attrs.y,
    placement: attrs.placement
  };
}
