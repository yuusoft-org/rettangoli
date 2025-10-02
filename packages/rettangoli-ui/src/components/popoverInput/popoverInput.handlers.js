export const handleBeforeMount = (deps) => {
  const { store, props } = deps;

  if (props.value !== undefined || props.defaultValue !== undefined) {
    store.setValue(props.value || props.defaultValue || '');
  }
}

export const handleOnUpdate = (deps, payload) => {
  const { oldProps, newProps} = payload
  const { store, props, render } = deps;

  if (oldProps.defaultValue !== newProps.defaultValue) {
    store.setValue(props.defaultValue || '');
  }

  render();
}

export const handleTextClick = (deps, payload) => {
  const { store, render, getRefIds, attrs } = deps;
  const event = payload._event;

  const value = store.selectValue();
  store.setTempValue(value)

  store.openPopover({
    position: {
      x: event.currentTarget.getBoundingClientRect().left,
      y: event.currentTarget.getBoundingClientRect().bottom,
    }
  });

  const { input } = getRefIds();
  input.elm.value = value;
  render();

  if (attrs['auto-focus']) {
    setTimeout(() => {
      input.elm.focus();
    }, 50)
  }
}

export const handlePopoverClose = (deps, payload) => {
  const { store, render } = deps;
  store.closePopover();
  render();
}

export const handleInputChange = (deps, payload) => {
  const { store, render, dispatchEvent } = deps;
  const event = payload._event;
  const value = event.detail.value;

  store.setTempValue(value);

  dispatchEvent(new CustomEvent('temp-input-change', {
    detail: { value },
    bubbles: true
  }));

  render();
}

export const handleSubmitClick = (deps, payload) => {
  const { store, render, dispatchEvent, getRefIds } = deps;
  const event = payload._event;
  const { input } = getRefIds()
  const value = input.elm.value;

  store.setValue(value)
  store.closePopover();

  dispatchEvent(new CustomEvent('input-change', {
    detail: { value },
    bubbles: true
  }));

  render();
}

export const handleInputKeydown = (deps, payload) => {
  const { store, render, dispatchEvent, getRefIds } = deps;
  const event = payload._event;

  if (event.key === 'Enter') {
    const { input } = getRefIds()
    const value = input.elm.value;

    store.closePopover();
    // Dispatch custom event
    dispatchEvent(new CustomEvent('input-change', {
      detail: { value },
      bubbles: true
    }));

    render();
  } else if (event.key === 'Escape') {
    store.closePopover();
    render();
  }
}
