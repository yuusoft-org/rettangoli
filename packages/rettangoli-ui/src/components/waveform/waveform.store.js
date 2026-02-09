export const createInitialState = () => Object.freeze({
  waveformData: null,
});

export const setWaveformData = ({ state }, payload = {}) => {
  state.waveformData = payload.data;
};

export const selectViewData = ({ state, props }) => {
  return {
    isLoading: props.isLoading,
    w: props.w || "250",
    h: props.h || "150",
    cur: props.cur,
    waveformData: props.waveformData,
  };
};
