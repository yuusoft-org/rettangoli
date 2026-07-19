const normalizePopoverValue = (value) => {
  if (value === undefined || value === null || value === true) {
    return "";
  }
  return String(value);
};

const commitValue = (deps, value) => {
  const { store, render, dispatchEvent } = deps;
  const nextValue = normalizePopoverValue(value);

  store.setValue({ value: nextValue });
  store.closePopover({});

  dispatchEvent(new CustomEvent("value-change", {
    detail: { value: nextValue },
    bubbles: true,
  }));

  render();
};

export const handleBeforeMount = (deps) => {
  const { store, props } = deps;

  if (props.value !== undefined) {
    const value = normalizePopoverValue(props.value);
    store.setValue({ value });
    store.setTempValue({ value });
  }
}

export const handleOnUpdate = (deps, payload) => {
  const { oldProps, newProps } = payload;
  const { store, render } = deps;
  const valueChanged = oldProps?.value !== newProps?.value;

  if (valueChanged) {
    const value = normalizePopoverValue(newProps?.value);
    store.setValue({ value });
    if (!store.getState().isOpen) {
      store.setTempValue({ value });
    }
  }

  render();
}

export const handleTextClick = (deps, payload) => {
  const { store, render, refs, props } = deps;
  if (props.disabled) {
    return;
  }
  const event = payload._event;

  const value = normalizePopoverValue(props.value);
  store.setValue({ value });
  store.setTempValue({ value });

  store.openPopover({
    position: {
      x: event.currentTarget.getBoundingClientRect().left,
      y: event.currentTarget.getBoundingClientRect().bottom,
    }
  });
  render();

  setTimeout(() => {
    const { input } = refs;
    if (!input) return;
    input.value = value;
    input.focus();
    const innerInput = input.shadowRoot?.querySelector("input, textarea");
    if (innerInput && typeof innerInput.focus === "function") {
      innerInput.focus();
    }
  }, 50);
}

export const handlePopoverClose = (deps, payload) => {
  const { store, render } = deps;
  store.closePopover({});
  render();
}

export const handleInputChange = (deps, payload) => {
  const { store } = deps;
  const event = payload._event;
  const value = normalizePopoverValue(event.detail.value);

  store.setTempValue({ value });
}

export const handleSubmitClick = (deps) => {
  const { store, refs } = deps;
  const { input } = refs;
  const value = input ? input.value : store.getState().tempValue;
  commitValue(deps, value);
}

export const handleInputKeydown = (deps, payload) => {
  const { store, refs } = deps;
  const event = payload._event;

  if (event.key === "Enter") {
    event.preventDefault();
    event.stopPropagation();
    const { input } = refs;
    const value = input ? input.value : store.getState().tempValue;
    commitValue(deps, value);
  } else if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    store.closePopover({});
    deps.render();
  }
}
