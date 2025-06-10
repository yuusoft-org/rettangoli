
export const handleOnMount = (deps) => {
  const { store, props, render } = deps;
  
  // Initialize selected value from props if provided
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
  const refIds = getRefIds();
  // const buttonRect = e.currentTarget.getBoundingClientRect();
  
  refIds.popover.elm.transformedHandlers.open({
    position: {
      x: e.clientX,
      y: e.clientY
    }
  });
}

export const handleOptionClick = (option, deps) => {
  const { render, element } = deps;
  element.dispatchEvent(new CustomEvent('option-selected', {
    detail: { value: option.value, label: option.label },
    bubbles: true
  }));
  
  render();
}
