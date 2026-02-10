export const handleBeforeMount = (deps) => {
  const { store, props } = deps;
  store.setValue({ value: props.value ?? 0 });
}

export const handleOnUpdate = (deps, payload) => {
  const { oldProps, newProps } = payload;
  const { store, render } = deps;

  if (oldProps?.value !== newProps?.value) {
    const value = newProps?.value ?? 0;
    store.setValue({ value });
    render();
  }
}

export const handleValueChange = (deps, payload) => {
  const { store, render, dispatchEvent } = deps;
  const event = payload._event;
  const newValue = Number(event.detail.value);

  store.setValue({ value: newValue });

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

  store.setValue({ value: newValue });

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
