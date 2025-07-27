export const INITIAL_STATE = Object.freeze({
  isLoading: true,
  waveformData: null,
});

export const setLoading = (state, loading) => {
  state.isLoading = loading;
};

export const setWaveformData = (state, data) => {
  state.waveformData = data;
};

export const toViewData = ({ state, attrs, props }) => {
  return {
    isLoading: state.isLoading,
    w: attrs.w || "250",
    h: attrs.h || "150",
    waveformData: props.waveformData,
  };
};
