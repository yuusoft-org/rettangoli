import { deepEqual } from "../../common.js";

const emitValueChange = ({ dispatchEvent, value, label, index, item }) => {
  dispatchEvent(
    new CustomEvent("value-change", {
      detail: {
        value,
        label,
        index,
        item,
      },
      bubbles: true,
    }),
  );
};

export const handleBeforeMount = (deps) => {
  const { store, props, render } = deps;

  if (
    props.selectedValue !== null &&
    props.selectedValue !== undefined &&
    props.options
  ) {
    const selectedOption = props.options.find((opt) =>
      deepEqual(opt.value, props.selectedValue),
    );
    if (selectedOption) {
      store.updateSelectedValue({
        value: selectedOption.value,
      });
      render();
    }
  }
};

export const handleOnUpdate = (deps, payload) => {
  const { oldProps, newProps } = payload;
  const { store, render } = deps;
  let shouldRender = false;

  if (oldProps.selectedValue !== newProps.selectedValue) {
    store.updateSelectedValue({ value: newProps.selectedValue });
    shouldRender = true;
  }

  if (oldProps.s !== newProps.s || oldProps.sq !== newProps.sq) {
    shouldRender = true;
  }

  if (shouldRender) {
    render();
  }
};

export const handleOptionClick = (deps, payload) => {
  const { render, dispatchEvent, props, store } = deps;
  if (props.disabled) return;

  const event = payload._event;
  event.stopPropagation();

  const id = event.currentTarget.id.slice("option".length);
  const index = Number(id);
  const option = props.options[index];
  const hasControlledValue = Object.prototype.hasOwnProperty.call(
    props || {},
    "selectedValue",
  );
  const currentValue = store.selectSelectedValue();
  const hasCurrentValue = hasControlledValue
    ? true
    : store.selectHasSelectedValue();
  const isSelected = option
    ? hasCurrentValue && deepEqual(option.value, currentValue)
    : false;

  if (!option) {
    return;
  }

  if (isSelected && !props.noClear) {
    store.clearSelectedValue({});

    if (props.onChange && typeof props.onChange === "function") {
      props.onChange(undefined);
    }

    emitValueChange({
      dispatchEvent,
      value: undefined,
      label: undefined,
      index: null,
      item: undefined,
    });

    render();
    return;
  }

  store.updateSelectedValue({ value: option.value });

  if (props.onChange && typeof props.onChange === "function") {
    props.onChange(option.value);
  }

  emitValueChange({
    dispatchEvent,
    value: option.value,
    label: option.label,
    index,
    item: option,
  });

  render();
};

export const handleOptionKeyDown = (deps, payload) => {
  const event = payload._event;
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  handleOptionClick(deps, payload);
};

export const handleOptionMouseEnter = (deps, payload) => {
  const { props, store, render } = deps;
  const event = payload._event;
  const id = parseInt(event.currentTarget.id.slice("option".length), 10);
  const option = props.options?.[id];
  store.setHoveredOption({ optionId: id });

  if (typeof option?.tooltip === "string" && option.tooltip.length > 0) {
    const rect = event.currentTarget.getBoundingClientRect();
    store.showTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 2,
      place: "t",
      content: option.tooltip,
    });
  } else {
    store.hideTooltip({});
  }

  render();
};

export const handleOptionMouseLeave = (deps) => {
  const { store, render } = deps;
  store.clearHoveredOption({});
  store.hideTooltip({});
  render();
};

export const handleAddOptionClick = (deps, payload) => {
  if (deps.props.disabled) return;

  const { render, dispatchEvent } = deps;
  const { _event: event } = payload;
  event.stopPropagation();

  dispatchEvent(
    new CustomEvent("add-option-click", {
      bubbles: true,
    }),
  );

  render();
};

export const handleAddOptionKeyDown = (deps, payload) => {
  const event = payload._event;
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  handleAddOptionClick(deps, payload);
};

export const handleAddOptionMouseEnter = (deps) => {
  const { store, render } = deps;
  store.setHoveredAddOption({ isHovered: true });
  render();
};

export const handleAddOptionMouseLeave = (deps) => {
  const { store, render } = deps;
  store.setHoveredAddOption({ isHovered: false });
  render();
};
