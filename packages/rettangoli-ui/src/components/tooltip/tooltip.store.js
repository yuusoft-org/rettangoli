export const createInitialState = () => Object.freeze({
});

const sizePresets = {
  sm: {
    textSize: 'sm',
    padding: 'md',
    maxWidth: 'min(320px, calc(100vw - 16px))',
  },
  md: {
    textSize: 'sm',
    padding: 'md',
    maxWidth: 'min(360px, calc(100vw - 16px))',
  },
  lg: {
    textSize: 'md',
    padding: 'lg',
    maxWidth: 'min(420px, calc(100vw - 16px))',
  },
};

export const selectViewData = ({ props }) => {
  const size = sizePresets[props.s] ? props.s : 'sm';
  const preset = sizePresets[size];

  return {
    open: !!props.open,
    x: props.x || 0,
    y: props.y || 0,
    place: props.place || 't',
    content: props.content || '',
    textSize: preset.textSize,
    padding: preset.padding,
    contentStyle: `padding: 0; min-width: 0; max-width: ${preset.maxWidth}; background-color: var(--muted);`,
  };
}
