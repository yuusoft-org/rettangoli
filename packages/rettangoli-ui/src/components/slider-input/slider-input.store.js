import { selectFieldAria } from "../../accessibility/field.js";
export const createInitialState = () => Object.freeze({
  value: 0,
  inputValue: 0
});

// Only a number sets an end of the slider's range. An empty attribute arrives
// as true, and a binding to an unset value renders an empty attribute.
const toSliderBound = (value, fallback) => {
  const isNumber = ["number", "string"].includes(typeof value)
    && String(value).trim() !== ""
    && Number.isFinite(Number(value));
  return isNumber ? value : fallback;
};

// min and max bound the value and the number input. The slider runs over
// sliderMin to sliderMax when set, so a typed value can go past its ends; the
// thumb then rests at the nearer end. The number input takes the input sizes,
// sm and the default md.
export const selectViewData = ({ state, props }) => {
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  return {
    ...selectFieldAria(props),
    key: props.key,
    value: state.value,
    inputValue: state.inputValue,
    w: props.w ?? '',
    s: props.s === "sm" ? "sm" : "md",
    min,
    max,
    sliderMin: toSliderBound(props.sliderMin, min),
    sliderMax: toSliderBound(props.sliderMax, max),
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
