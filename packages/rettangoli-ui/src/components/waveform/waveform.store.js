export const createInitialState = () => Object.freeze({
  waveformData: null,
});

export const setWaveformData = (state, data) => {
  state.waveformData = data;
};

export const selectViewData = ({ state, attrs, props }) => {
  return {
    isLoading: props.isLoading,
    w: attrs.w || "250",
    h: attrs.h || "150",
    cur: attrs.cur,
    waveformData: props.waveformData,
  };
};
