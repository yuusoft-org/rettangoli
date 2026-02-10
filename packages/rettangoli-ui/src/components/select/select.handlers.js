import { deepEqual } from '../../common.js';

export const handleBeforeMount = (deps) => {
  const { store, props, render } = deps;

  if (props.selectedValue !== null && props.selectedValue !== undefined && props.options) {
    const selectedOption = props.options.find(opt => deepEqual(opt.value, props.selectedValue));
    if (selectedOption) {
      store.updateSelectedValue({
        value: selectedOption?.value
      });
      render();
    }
  }
}

export const handleOnUpdate = (deps, payload) => {
  const { oldProps, newProps } = payload;
  const { store, render } = deps;

  // Check if key changed
  if (oldProps?.key !== newProps?.key && newProps?.key) {
    // Clear current state using store action
    store.resetSelection({});

    // Re-apply the prop value if available
    const selectedValue = newProps?.selectedValue;
    const options = newProps?.options || [];

    if (selectedValue !== null && selectedValue !== undefined && options) {
      const selectedOption = options.find(opt => deepEqual(opt.value, selectedValue));
      if (selectedOption) {
        store.updateSelectedValue({
          value: selectedOption.value
        });
      }
    }
    render();
  } else if (oldProps.selectedValue !== newProps.selectedValue) {
    store.updateSelectedValue({ value: newProps.selectedValue });
    render();
  }
}

export const handleButtonClick = (deps, payload) => {
  const { store, render, refs, props } = deps;
  const event = payload._event;
  event.stopPropagation();

  const button = refs.selectButton;

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

export const handleClickOptionsPopoverOverlay = (deps) => {
  const { store, render } = deps;
  store.closeOptionsPopover({});
  render();
}

export const handleOptionClick = (deps, payload) => {
  const { render, dispatchEvent, props, store } = deps;
  const event = payload._event;
  event.stopPropagation();
  const id = event.currentTarget.id.slice('option'.length);
  const index = Number(id);

  const option = props.options[id];

  // Update internal state
  store.updateSelectedValue({ value: option?.value });

  // Call onChange if provided
  if (props.onChange && typeof props.onChange === 'function') {
    props.onChange(option.value);
  }

  dispatchEvent(new CustomEvent('value-change', {
    detail: {
      value: option.value,
      label: option.label,
      index,
      item: option,
    },
    bubbles: true
  }));

  render();
}

export const handleOptionMouseEnter = (deps, payload) => {
  const { store, render } = deps;
  const event = payload._event;
  const id = parseInt(event.currentTarget.id.slice('option'.length), 10);
  store.setHoveredOption({ optionId: id });
  render();
}

export const handleOptionMouseLeave = (deps, payload) => {
  const { store, render } = deps;
  store.clearHoveredOption({});
  render();
}

export const handleClearClick = (deps, payload) => {
  const { store, render, dispatchEvent, props } = deps;
  const event = payload._event;

  event.stopPropagation();

  // Clear the internal state
  store.clearSelectedValue({});

  // Call onChange if provided
  if (props.onChange && typeof props.onChange === 'function') {
    props.onChange(undefined);
  }

  dispatchEvent(new CustomEvent('value-change', {
    detail: {
      value: undefined,
      label: undefined,
      index: null,
      item: undefined,
    },
    bubbles: true
  }));

  render();
}

export const handleAddOptionClick = (deps, payload) => {
  const { store, render, dispatchEvent } = deps;
  const { _event: event } = payload;
  event.stopPropagation();
  // Close the popover
  store.closeOptionsPopover({});

  dispatchEvent(new CustomEvent('add-option-click', {
    bubbles: true,
  }));

  render();
}

export const handleAddOptionMouseEnter = (deps, payload) => {
  const { store, render } = deps;
  store.setHoveredAddOption({ isHovered: true });
  render();
}

export const handleAddOptionMouseLeave = (deps, payload) => {
  const { store, render } = deps;
  store.setHoveredAddOption({ isHovered: false });
  render();
}
