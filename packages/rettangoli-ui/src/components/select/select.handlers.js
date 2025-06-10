
export const handleOnMount = (deps) => {
  const { store, props, render } = deps;
  
  if (props.selectedValue !== null && props.selectedValue !== undefined && props.options) {
    const selectedOption = props.options.find(opt => opt.value === props.selectedValue);
    if (selectedOption) {
      store.update((state) => {
        state.selectedValue = selectedOption.value;
        state.selectedLabel = selectedOption.label;
      });
      render();
    }
  }
}

export const handleButtonClick = (e, deps) => {
  const { store, render, getRefIds } = deps;
  store.openOptionsPopover({
    position: {
      y: e.clientY,
      x: e.clientX,
    }
  })
  render();
}

export const handleClickOptionsPopoverOverlay = (e, deps) => {
  const { store, render } = deps;
  store.closeOptionsPopover();
  render();
}

export const handleOptionClick = (e, deps) => {
  const { render, dispatchEvent, props } = deps;
  const id = e.currentTarget.id.replace('option-', '');

  const option = props.options[id];

  dispatchEvent(new CustomEvent('option-selected', {
    detail: { value: option.value, label: option.label },
    bubbles: true
  }));
  
  render();
}
