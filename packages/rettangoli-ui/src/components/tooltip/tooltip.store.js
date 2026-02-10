export const createInitialState = () => Object.freeze({
});

export const selectViewData = ({ props }) => {
  return {
    open: !!props.open,
    x: props.x || 0,
    y: props.y || 0,
    place: props.place || 't',
    content: props.content || ''
  };
}
