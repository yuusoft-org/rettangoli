import { deepEqual } from '../../common.js';

export const handleBeforeMount = (deps) => {
  const { store, props, render } = deps;
  
  if (props.selectedValue !== null && props.selectedValue !== undefined && props.options) {
    const selectedOption = props.options.find(opt => deepEqual(opt.value, props.selectedValue));
    if (selectedOption) {
      store.updateSelectOption(selectedOption);
      render();
    }
  }
}

export const handleOnUpdate = (changes, deps) => {
  const { oldAttrs, newAttrs, oldProps, newProps } = changes;
  const { store, props, render } = deps;
  
  // Check if key changed
  if (oldAttrs?.key !== newAttrs?.key && newAttrs?.key) {
    // Clear current state using store action
    store.resetSelection();
    
    // Re-apply the prop value if available
    const selectedValue = newProps?.selectedValue || props?.selectedValue;
    const options = newProps?.options || props?.options;
    
    if (selectedValue !== null && selectedValue !== undefined && options) {
      const selectedOption = options.find(opt => deepEqual(opt.value, selectedValue));
      if (selectedOption) {
        store.updateSelectOption(selectedOption);
      }
    }
    render();
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
  const { render, dispatchEvent, props, store } = deps;
  const id = e.currentTarget.id.replace('option-', '');

  const option = props.options[id];

  // Update internal state
  store.updateSelectOption(option);

  // Call onChange if provided
  if (props.onChange && typeof props.onChange === 'function') {
    props.onChange(option.value);
  }

  // Dispatch custom event for backward compatibility
  dispatchEvent(new CustomEvent('option-selected', {
    detail: { value: option.value, label: option.label },
    bubbles: true
  }));

  // Also dispatch select-change event to match form's event listener pattern
  dispatchEvent(new CustomEvent('select-change', {
    detail: { selectedValue: option.value },
    bubbles: true
  }));
  
  render();
}
