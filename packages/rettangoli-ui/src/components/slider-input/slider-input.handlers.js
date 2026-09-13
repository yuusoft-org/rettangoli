const normalizeValue = (value, props, fallback = 0) => {
  const parsed = value === null || value === undefined || value === "" ? fallback : Number(value);
  const number = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(Number(props.max ?? 100), Math.max(Number(props.min ?? 0), number));
};

export const handleBeforeMount = ({ store, props }) => {
  store.setValue({ value: normalizeValue(props.value, props) });
};

export const handleOnUpdate = ({ store, render, props }, { oldProps, newProps }) => {
  const keyChanged = oldProps?.key !== newProps?.key;
  if (keyChanged || oldProps?.value !== newProps?.value) {
    const value = normalizeValue(newProps?.value, props);
    // A controlled parent may echo a live edit. Keep the native draft/caret.
    if (keyChanged || value !== store.selectValue()) store.setValue({ value });
    render();
  }
};

export const handleValueInput = ({ store, render, dispatchEvent }, { _event: event }) => {
  const value = event.detail.value;
  if (event.currentTarget.id === "input") {
    // Never write back into the number editor during input. Its raw draft can
    // be empty, a minus sign, or a trailing decimal while the slider stays valid.
    if (value !== null && value !== undefined && Number.isFinite(Number(value))) {
      store.setDraftValue({ value: Number(value) });
    }
  } else {
    store.setValue({ value: Number(value) });
  }
  render();
  dispatchEvent(new CustomEvent("value-input", {
    detail: { value }, bubbles: true,
  }));
};

export const handleValueChange = ({ store, render, dispatchEvent, props, refs }, { _event: event }) => {
  const value = normalizeValue(event.detail.value, props, store.selectValue());
  store.setValue({ value });
  render();
  // Empty drafts may leave the VDOM attribute unchanged; commit explicitly
  // through the primitive's public value contract in that case too.
  if (refs?.input) refs.input.value = value;
  dispatchEvent(new CustomEvent("value-change", {
    detail: { value }, bubbles: true,
  }));
};
