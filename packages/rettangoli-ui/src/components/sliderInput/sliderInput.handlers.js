export const handleBeforeMount = (deps) => {
  const { store, attrs } = deps;
  store.setValue(attrs.defaultValue || 0);
} 

export const handleValueChange = (e, deps) => {
  const { store, render, dispatchEvent } = deps;
  const newValue = Number(e.detail.value);

  store.setValue(newValue);
  
  // Re-render to sync slider and input
  render();
  
  // Dispatch event for external listeners
  dispatchEvent(
    new CustomEvent("slider-input-value-change", {
      detail: {
        value: newValue,
      },
      bubbles: true,
    }),
  );
};
