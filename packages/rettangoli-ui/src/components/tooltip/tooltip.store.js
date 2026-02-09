export const createInitialState = () => Object.freeze({
});

export const selectViewData = ({ props }) => {
  return {
    open: !!props.open,
    x: props.x || 0,
    y: props.y || 0,
    placement: props.placement || 'top',
    content: props.content || ''
  };
}
