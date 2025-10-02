export const createInitialState = () => Object.freeze({
});

export const selectViewData = ({ attrs }) => {
  return {
    open: !!attrs.open,
    x: attrs.x || 0,
    y: attrs.y || 0,
    placement: attrs.placement || 'top',
    content: attrs.content || ''
  };
}