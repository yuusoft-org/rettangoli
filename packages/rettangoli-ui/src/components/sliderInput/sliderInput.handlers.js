export const handleBeforeMount = (deps) => {
  const { store, attrs } = deps;
  store.setValue(attrs.defaultValue || 0);
}

export const handleOnUpdate = (deps, payload) => {
  const { oldAttrs, newAttrs } = payload;
  const { store, render, attrs } = deps;

  // Reset when key changes
  if (oldAttrs?.key !== newAttrs?.key && newAttrs?.key) {
    const defaultValue = newAttrs?.defaultValue || attrs?.defaultValue || 0;
    store.setValue(defaultValue);
    render();
  } else if (oldAttrs?.defaultValue !== newAttrs?.defaultValue) {
    // Also reset when defaultValue changes
    const defaultValue = newAttrs?.defaultValue || 0;
    store.setValue(defaultValue);
    render();
  }
}

export const handleValueChange = (deps, payload) => {
  const { store, render, dispatchEvent } = deps;
  const event = payload._event;
  const newValue = Number(event.detail.value);

  store.setValue(newValue);

  // Re-render to sync slider and input
  render();

  // Dispatch event for external listeners
  dispatchEvent(
    new CustomEvent("slider-input-value-change", {
      detail: {
        value: newValue,
      },
      bubbles: true,
    }),
  );
};
