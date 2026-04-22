const getOptionType = (option = {}) => {
  if (option.type === "section") {
    return "section";
  }

  if (option.type === "separator") {
    return "separator";
  }

  return "item";
};

const normalizeSelectedValues = (selectedValues) => {
  if (!Array.isArray(selectedValues)) {
    return [];
  }

  return [...selectedValues];
};

const resolveCurrentValues = ({ store, props }) => {
  if (store.selectHasSelectedValues()) {
    return store.selectSelectedValues();
  }

  return normalizeSelectedValues(props.selectedValues);
};

const emitValueChange = ({
  dispatchEvent,
  value,
  operation,
  changedValue,
  label,
  index,
  item,
}) => {
  dispatchEvent(
    new CustomEvent("value-change", {
      detail: {
        value,
        operation,
        changedValue,
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

  if (props.selectedValues !== undefined) {
    store.updateSelectedValues({ values: props.selectedValues });
    render();
  }
};

export const handleOnUpdate = (deps, payload) => {
  const { oldProps, newProps } = payload;
  const { store, render } = deps;
  let shouldRender = false;

  if (!!newProps?.disabled && !oldProps?.disabled) {
    store.closeOptionsPopover({});
    shouldRender = true;
  }

  if (oldProps.selectedValues !== newProps.selectedValues) {
    store.updateSelectedValues({ values: newProps.selectedValues, syncDraft: true });
    shouldRender = true;
  }

  if (oldProps.options !== newProps.options) {
    shouldRender = true;
  }

  if (shouldRender) {
    render();
  }
};

export const handleTriggerClick = (deps, payload) => {
  const { store, render, refs, props } = deps;
  if (props.disabled) return;

  const event = payload._event;
  event.stopPropagation();

  const trigger = refs.trigger;
  const rect = trigger.getBoundingClientRect();
  const currentValues = resolveCurrentValues({ store, props });

  store.openOptionsPopover({
    position: {
      x: Math.round(rect.left),
      y: Math.round(rect.bottom + 12),
      w: Math.max(Math.round(rect.width), 240),
    },
    values: currentValues,
  });
  render();
};

export const handleTriggerKeyDown = (deps, payload) => {
  const event = payload._event;
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  handleTriggerClick(deps, payload);
};

export const handlePopoverClose = (deps) => {
  const { store, render } = deps;
  store.closeOptionsPopover({});
  render();
};

export const handleOptionClick = (deps, payload) => {
  const { render, props, store } = deps;
  if (props.disabled) return;

  const event = payload._event;
  event.stopPropagation();

  const id = event.currentTarget.id.slice("option".length);
  const index = Number(id);
  const option = props.options[index];

  if (!option || getOptionType(option) !== "item") {
    return;
  }

  store.toggleDraftSelectedValue({ value: option.value });
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

export const handleSubmitClick = (deps, payload) => {
  const { store, props, render, dispatchEvent } = deps;
  if (props.disabled) return;

  const event = payload._event;
  event.stopPropagation();

  const nextValues = store.selectDraftSelectedValues();

  store.commitDraftSelectedValues({});

  if (props.onChange && typeof props.onChange === "function") {
    props.onChange(nextValues);
  }

  emitValueChange({
    dispatchEvent,
    value: nextValues,
    operation: "set",
    changedValue: undefined,
    label: undefined,
    index: null,
    item: undefined,
  });

  render();
};

export const handleAddOptionClick = (deps, payload) => {
  const { props, dispatchEvent } = deps;
  if (props.disabled) return;

  const event = payload._event;
  event.stopPropagation();

  dispatchEvent(new CustomEvent("add-option-click", {
    bubbles: true,
    composed: true,
  }));
};
