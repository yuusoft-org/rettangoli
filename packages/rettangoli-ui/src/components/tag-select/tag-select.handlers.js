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

const resolvePopoverPosition = (trigger) => {
  if (!trigger || typeof trigger.getBoundingClientRect !== "function") {
    return undefined;
  }

  const rect = trigger.getBoundingClientRect();
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.bottom + 12),
    w: Math.max(Math.round(rect.width), 240),
  };
};

const resolveCurrentValues = ({ store, props }) => {
  if (store.selectHasSelectedValues()) {
    return store.selectSelectedValues();
  }

  return normalizeSelectedValues(props.selectedValues);
};

const resolveDraftValues = ({ store, props }) => {
  if (Array.isArray(props?.draftSelectedValues)) {
    return normalizeSelectedValues(props.draftSelectedValues);
  }

  if (store.getState().isOpen) {
    return store.selectDraftSelectedValues();
  }

  return resolveCurrentValues({ store, props });
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

const emitDraftValueChange = ({ dispatchEvent, value }) => {
  dispatchEvent(
    new CustomEvent("draft-value-change", {
      detail: {
        value,
      },
      bubbles: true,
    }),
  );
};

const emitOpenChange = ({ dispatchEvent, open }) => {
  dispatchEvent(
    new CustomEvent("open-change", {
      detail: {
        open,
      },
      bubbles: true,
    }),
  );
};

const openControlledPopover = ({ store, props, refs } = {}) => {
  const position = resolvePopoverPosition(refs?.trigger);
  if (!position) {
    return false;
  }

  store.openOptionsPopover({
    position,
    values: resolveDraftValues({ store, props }),
  });

  return true;
};

export const handleBeforeMount = (deps) => {
  const { store, props, render, refs } = deps;
  let shouldRender = false;

  if (props.selectedValues !== undefined) {
    store.updateSelectedValues({
      values: props.selectedValues,
      syncDraft: props.draftSelectedValues === undefined,
      preserveDraft: Array.isArray(props.draftSelectedValues),
    });
    shouldRender = true;
  }

  if (Array.isArray(props.draftSelectedValues)) {
    store.updateDraftSelectedValues({
      values: props.draftSelectedValues,
    });
    shouldRender = true;
  }

  if (props.open === true && !props.disabled && openControlledPopover(deps)) {
    shouldRender = true;
  }

  if (shouldRender) {
    render();
  }
};

export const handleAfterMount = (deps) => {
  const { props, render, store, dispatchEvent } = deps;

  if (props.disabled) {
    if (props.open === true) {
      emitOpenChange({
        dispatchEvent,
        open: false,
      });
    }
    return;
  }

  if (props.open === true && !store.getState().isOpen) {
    if (openControlledPopover(deps)) {
      render();
    }
  }
};

export const handleOnUpdate = (deps, payload) => {
  const { oldProps, newProps } = payload;
  const { store, render, refs } = deps;
  let shouldRender = false;

  if (!!newProps?.disabled && !oldProps?.disabled) {
    const wasOpen = store.getState().isOpen;
    store.closeOptionsPopover({});
    if (wasOpen) {
      emitOpenChange({
        dispatchEvent: deps.dispatchEvent,
        open: false,
      });
    }
    shouldRender = true;
  }

  if (oldProps.selectedValues !== newProps.selectedValues) {
    store.updateSelectedValues({
      values: newProps.selectedValues,
      syncDraft: newProps.draftSelectedValues === undefined,
      preserveDraft: Array.isArray(newProps.draftSelectedValues),
    });
    shouldRender = true;
  }

  if (oldProps.draftSelectedValues !== newProps.draftSelectedValues) {
    store.updateDraftSelectedValues({
      values: Array.isArray(newProps?.draftSelectedValues)
        ? newProps.draftSelectedValues
        : resolveCurrentValues({ store, props: newProps }),
    });
    shouldRender = true;
  }

  if (oldProps.open !== newProps.open && newProps.open !== undefined) {
    if (newProps.open) {
      if (newProps.disabled) {
        emitOpenChange({
          dispatchEvent: deps.dispatchEvent,
          open: false,
        });
      } else if (
        openControlledPopover({
          store,
          props: newProps,
          refs,
        })
      ) {
        shouldRender = true;
      }
    } else {
      store.closeOptionsPopover({});
      shouldRender = true;
    }
  }

  if (oldProps.options !== newProps.options) {
    const hasCurrentValues = resolveCurrentValues({ store, props: newProps }).length > 0;

    if (store.getState().isOpen || hasCurrentValues) {
      shouldRender = true;
    }
  }

  if (shouldRender) {
    render();
  }
};

export const handleTriggerClick = (deps, payload) => {
  const { store, render, refs, props, dispatchEvent } = deps;
  if (props.disabled) return;

  const event = payload._event;
  event.stopPropagation();

  const position = resolvePopoverPosition(refs.trigger);
  if (!position) {
    return;
  }

  store.openOptionsPopover({
    position,
    values: resolveDraftValues({ store, props }),
  });
  emitOpenChange({
    dispatchEvent,
    open: true,
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
  const { store, render, dispatchEvent } = deps;
  store.closeOptionsPopover({});
  emitOpenChange({
    dispatchEvent,
    open: false,
  });
  render();
};

export const handleOptionClick = (deps, payload) => {
  const { render, props, store, dispatchEvent } = deps;
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
  emitDraftValueChange({
    dispatchEvent,
    value: store.selectDraftSelectedValues(),
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

  emitOpenChange({
    dispatchEvent,
    open: false,
  });

  render();
};

export const handleAddOptionClick = (deps, payload) => {
  const { props, dispatchEvent } = deps;
  if (props.disabled || props.noAdd) return;

  const event = payload._event;
  event.stopPropagation();

  dispatchEvent(new CustomEvent("add-option-click", {
    bubbles: true,
    composed: true,
  }));
};
