import { deepEqual } from "../../common.js";
import {
  normalizeSelectedValues,
  resolveCurrentValues,
  resolvePopoverPosition,
} from "../../common/choice.js";

const renderInstance = (instance) => {
  if (typeof instance.render === "function") {
    instance.render();
  }
};

const openPopoverWithDraft = (instance, values = []) => {
  const position = resolvePopoverPosition(instance.refs?.trigger);

  if (!position || !instance.store?.openOptionsPopover) {
    return false;
  }

  instance.store.openOptionsPopover({
    position,
    values,
  });

  return true;
};

const setDraftValues = (instance, values = [], keepOpen = false) => {
  const state = instance.store?.getState?.();

  if (state?.isOpen && instance.store?.updateDraftSelectedValues) {
    instance.store.updateDraftSelectedValues({ values });
    return true;
  }

  if (keepOpen) {
    return openPopoverWithDraft(instance, values);
  }

  return false;
};

export const refreshPopover = function (payload = {}) {
  const state = this.store?.getState?.();
  const draftValues = Array.isArray(payload.values)
    ? normalizeSelectedValues(payload.values)
    : (this.store?.selectDraftSelectedValues?.() || []);

  if (state?.isOpen) {
    const position = resolvePopoverPosition(this.refs?.trigger);

    if (position) {
      this.store.openOptionsPopover({
        position,
        values: draftValues,
      });
    }
  } else if (payload.keepOpen) {
    openPopoverWithDraft(this, draftValues.length > 0 ? draftValues : resolveCurrentValues(this));
  }

  renderInstance(this);
};

export const setDraftSelectedValues = function (payload = {}) {
  const values = normalizeSelectedValues(payload.values);

  if (!setDraftValues(this, values, !!payload.keepOpen)) {
    return;
  }

  renderInstance(this);
};

export const appendDraftSelectedValue = function (payload = {}) {
  if (!Object.prototype.hasOwnProperty.call(payload || {}, "value")) {
    return;
  }

  const state = this.store?.getState?.();
  const currentValues = state?.isOpen
    ? (this.store?.selectDraftSelectedValues?.() || [])
    : resolveCurrentValues(this);

  if (currentValues.some((currentValue) => deepEqual(currentValue, payload.value))) {
    if (!!payload.keepOpen && !state?.isOpen && openPopoverWithDraft(this, currentValues)) {
      renderInstance(this);
    }

    return;
  }

  const nextValues = [...normalizeSelectedValues(currentValues), payload.value];

  if (!setDraftValues(this, nextValues, !!payload.keepOpen)) {
    return;
  }

  renderInstance(this);
};
