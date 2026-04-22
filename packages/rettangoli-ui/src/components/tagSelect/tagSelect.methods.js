const resolvePopoverPosition = (trigger) => {
  if (!trigger || typeof trigger.getBoundingClientRect !== "function") {
    return null;
  }

  const rect = trigger.getBoundingClientRect();
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.bottom + 12),
    w: Math.max(Math.round(rect.width), 240),
  };
};

export const refreshPopover = function () {
  const state = this.store?.getState?.();

  if (state?.isOpen) {
    const position = resolvePopoverPosition(this.refs?.trigger);
    const draftValues = this.store?.selectDraftSelectedValues?.() || [];

    if (position) {
      this.store.openOptionsPopover({
        position,
        values: draftValues,
      });
    }
  }

  if (typeof this.render === "function") {
    this.render();
  }
};
