export const INITIAL_STATE = Object.freeze({
  waveformData: null,
});

export const setWaveformData = (state, data) => {
  state.waveformData = data;
};

export const toViewData = ({ state, attrs, props }) => {
  return {
    isLoading: props.isLoading,
    w: attrs.w || "250",
    h: attrs.h || "150",
    waveformData: props.waveformData,
  };
};
