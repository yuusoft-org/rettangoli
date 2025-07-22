
export const INITIAL_STATE = Object.freeze({
});

export const toViewData = ({ props, attrs }) => {
  return {
    items: props.items || [],
    open: !!attrs.open,
    x: attrs.x,
    y: attrs.y,
    placement: attrs.placement
  };
}
