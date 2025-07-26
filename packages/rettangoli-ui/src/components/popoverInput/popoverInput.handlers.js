export const handleBeforeMount = (deps) => {
  const { store, props } = deps;

  if (props.value !== undefined || props.defaultValue !== undefined) {
    store.setValue(props.value || props.defaultValue || '');
  }
}

export const handleTextClick = (e, deps) => {
  const { store, render, getRefIds, attrs } = deps;

  const value = store.selectValue();
  store.setTempValue(value)

  store.openPopover({
    position: {
      x: e.currentTarget.getBoundingClientRect().left,
      y: e.currentTarget.getBoundingClientRect().bottom,
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

export const handlePopoverClose = (e, deps) => {
  const { store, render } = deps;
  store.closePopover();
  render();
}

export const handleInputChange = (e, deps) => {
  const { store, render, dispatchEvent } = deps;
  const value = e.detail.value;

  store.setTempValue(value);

  dispatchEvent(new CustomEvent('temp-input-change', {
    detail: { value },
    bubbles: true
  }));

  render();
}

export const handleSubmitClick = (e, deps) => {
  const { store, render, dispatchEvent, getRefIds } = deps;
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

export const handleInputKeydown = (e, deps) => {
  const { store, render, dispatchEvent, getRefIds } = deps;

  if (e.key === 'Enter') {
    const { input } = getRefIds()
    const value = input.elm.value;

    store.closePopover();
    // Dispatch custom event
    dispatchEvent(new CustomEvent('input-change', {
      detail: { value },
      bubbles: true
    }));

    render();
  } else if (e.key === 'Escape') {
    store.closePopover();
    render();
  }
}
