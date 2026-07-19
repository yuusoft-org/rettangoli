export const handleBeforeMount = (deps) => {
  const { store, props } = deps;
  store.setValue({ value: props.value ?? 0 });
}

export const handleOnUpdate = (deps, payload) => {
  const { oldProps, newProps } = payload;
  const { store, render } = deps;
  const keyChanged = oldProps?.key !== newProps?.key;
  const valueChanged = oldProps?.value !== newProps?.value;

  if (keyChanged || valueChanged) {
    const value = newProps?.value ?? 0;
    store.setValue({ value });
    render();
  }
}

export const handleValueChange = (deps, payload) => {
  const { store, render, dispatchEvent } = deps;
  const event = payload._event;
  const newValue = Number(event.detail.value);
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  const host = path.find((node) => node?.tagName === "RTGL-SLIDER-INPUT")
    || event.currentTarget?.getRootNode?.()?.host;

  store.setValue({ value: newValue });
  if (host && typeof host.setAttribute === "function") {
    host.setAttribute("value", String(newValue));
  }

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
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  const host = path.find((node) => node?.tagName === "RTGL-SLIDER-INPUT")
    || event.currentTarget?.getRootNode?.()?.host;

  store.setValue({ value: newValue });
  if (host && typeof host.setAttribute === "function") {
    host.setAttribute("value", String(newValue));
  }

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
