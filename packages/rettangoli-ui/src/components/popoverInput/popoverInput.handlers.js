export const handleBeforeMount = (deps) => {
  const { store, props } = deps;

  if (props.value !== undefined) {
    store.setValue({ value: props.value || '' });
  }
}

export const handleOnUpdate = (deps, payload) => {
  const { oldProps, newProps } = payload;
  const { store, render } = deps;

  if (oldProps?.value !== newProps?.value) {
    const value = newProps?.value ?? '';
    store.setValue({ value });
  }

  render();
}

export const handleTextClick = (deps, payload) => {
  const { store, render, refs, props } = deps;
  const event = payload._event;

  const value = store.selectValue();
  store.setTempValue({ value })

  store.openPopover({
    position: {
      x: event.currentTarget.getBoundingClientRect().left,
      y: event.currentTarget.getBoundingClientRect().bottom,
    }
  });

  const { input } = refs;
  input.value = value;
  render();

  if (props.autoFocus) {
    setTimeout(() => {
      input.focus();
    }, 50)
  }
}

export const handlePopoverClose = (deps, payload) => {
  const { store, render } = deps;
  store.closePopover({});
  render();
}

export const handleInputChange = (deps, payload) => {
  const { store, render, dispatchEvent } = deps;
  const event = payload._event;
  const value = event.detail.value;

  store.setTempValue({ value });

  dispatchEvent(new CustomEvent('value-input', {
    detail: { value },
    bubbles: true,
  }));

  render();
}

export const handleSubmitClick = (deps) => {
  const { store, render, dispatchEvent, refs } = deps;
  const { input } = refs
  const value = input.value;

  store.setValue({ value });
  store.closePopover({});

  dispatchEvent(new CustomEvent('value-change', {
    detail: { value },
    bubbles: true,
  }));

  render();
}

export const handleInputKeydown = (deps, payload) => {
  const { store, render, dispatchEvent, refs } = deps;
  const event = payload._event;

  if (event.key === 'Enter') {
    const { input } = refs
    const value = input.value;

    store.closePopover({});
    // Dispatch custom event
    dispatchEvent(new CustomEvent('value-change', {
      detail: { value },
      bubbles: true,
    }));

    render();
  } else if (event.key === 'Escape') {
    store.closePopover({});
    render();
  }
}
