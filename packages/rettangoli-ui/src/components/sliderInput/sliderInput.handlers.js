export const handleBeforeMount = (deps) => {
  const { store, attrs } = deps;
  store.setValue(attrs.value ?? 0);
}

export const handleOnUpdate = (deps, payload) => {
  const { oldAttrs, newAttrs } = payload;
  const { store, render } = deps;

  if (oldAttrs?.value !== newAttrs?.value) {
    const value = newAttrs?.value ?? 0;
    store.setValue(value);
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
    new CustomEvent("value-change", {
      detail: {
        value: newValue,
      },
      bubbles: true,
    }),
  );
};

export const handleValueInput = (deps, payload) => {
  const { store, render, dispatchEvent } = deps;
  const event = payload._event;
  const newValue = Number(event.detail.value);

  store.setValue(newValue);

  // Re-render to sync slider and input
  render();

  dispatchEvent(
    new CustomEvent("value-input", {
      detail: {
        value: newValue,
      },
      bubbles: true,
    }),
  );
};
