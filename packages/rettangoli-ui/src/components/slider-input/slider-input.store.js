import { selectFieldAria } from "../../accessibility/field.js";
export const createInitialState = () => Object.freeze({
  value: 0,
  inputValue: 0
});

export const selectViewData = ({ state, props }) => {
  return {
    ...selectFieldAria(props),
    key: props.key,
    value: state.value,
    inputValue: state.inputValue,
    w: props.w ?? '',
    min: props.min ?? 0,
    max: props.max ?? 100,
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
