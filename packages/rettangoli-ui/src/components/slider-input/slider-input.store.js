import { selectFieldAria } from "../../accessibility/field.js";
export const createInitialState = () => Object.freeze({
  value: 0,
  inputValue: 0
});

// min and max bound the value and the number input. The slider runs over
// sliderMin to sliderMax when set, so a typed value can go past its ends; the
// thumb then rests at the nearer end.
export const selectViewData = ({ state, props }) => {
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  return {
    ...selectFieldAria(props),
    key: props.key,
    value: state.value,
    inputValue: state.inputValue,
    w: props.w ?? '',
    min,
    max,
    sliderMin: props.sliderMin ?? min,
    sliderMax: props.sliderMax ?? max,
    step: props.step ?? 1,
    disabled: Boolean(props.disabled),
  };
}

export const setValue = ({ state }, payload = {}) => {
  state.value = payload.value;
  state.inputValue = payload.value;
}

export const setDraftValue = ({ state }, { value }) => {
  state.value = value;
};

export const selectValue = ({ state }) => state.value;
