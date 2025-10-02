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

export const handleButtonClick = (deps, event) => {
  const { store, render, getRefIds, props } = deps;

  const button = getRefIds()['select-button'].elm;

  // Get first child's bounding rectangle (since button has display: contents)
  const firstChild = button.firstElementChild;
  const rect = firstChild ? firstChild.getBoundingClientRect() : button.getBoundingClientRect();

  // Find the index of the currently selected option
  const storeSelectedValue = store.selectSelectedValue();
  const currentValue = storeSelectedValue !== null ? storeSelectedValue : props.selectedValue;
  let selectedIndex = null;
  if (currentValue !== null && currentValue !== undefined && props.options) {
    selectedIndex = props.options.findIndex(opt => deepEqual(opt.value, currentValue));
    if (selectedIndex === -1) selectedIndex = null;
  }

  store.openOptionsPopover({
    position: {
      y: rect.bottom + 12,  // Bottom edge of button
      x: rect.left - 24,    // Left edge of button
    },
    selectedIndex
  })
  render();
}

export const handleClickOptionsPopoverOverlay = (deps, event) => {
  const { store, render } = deps;
  store.closeOptionsPopover();
  render();
}

export const handleOptionClick = (deps, event) => {
  const { render, dispatchEvent, props, store } = deps;
  const id = event.currentTarget.id.replace('option-', '');

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

export const handleOptionMouseEnter = (deps, event) => {
  const { store, render } = deps;
  const id = parseInt(event.currentTarget.id.replace('option-', ''));
  store.setHoveredOption(id);
  render();
}

export const handleOptionMouseLeave = (deps, event) => {
  const { store, render } = deps;
  store.clearHoveredOption();
  render();
}

export const handleClearClick = (deps, event) => {
  const { store, render, dispatchEvent, props } = deps;

  event.stopPropagation();

  // Clear the internal state
  store.clearSelectedValue();

  // Call onChange if provided
  if (props.onChange && typeof props.onChange === 'function') {
    props.onChange(undefined);
  }

  // Dispatch custom event for backward compatibility
  dispatchEvent(new CustomEvent('option-selected', {
    detail: { value: undefined, label: undefined },
    bubbles: true
  }));

  // Also dispatch select-change event to match form's event listener pattern
  dispatchEvent(new CustomEvent('select-change', {
    detail: { selectedValue: undefined },
    bubbles: true
  }));

  render();
}

export const handleAddOptionClick = (deps, event) => {
  const { store, render, dispatchEvent } = deps;

  // Close the popover
  store.closeOptionsPopover();

  // Dispatch custom event for add option (no detail)
  dispatchEvent(new CustomEvent('add-option-selected', {
    bubbles: true
  }));

  render();
}

export const handleAddOptionMouseEnter = (deps, event) => {
  const { store, render } = deps;
  store.setHoveredAddOption(true);
  render();
}

export const handleAddOptionMouseLeave = (deps, event) => {
  const { store, render } = deps;
  store.setHoveredAddOption(false);
  render();
}
