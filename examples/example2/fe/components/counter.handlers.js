export const handleIncrement = (deps) => {
  deps.store.increment({});
  deps.render();
  deps.dispatchEvent(new CustomEvent('count-changed', { bubbles: true, composed: true }));
};

export const handleDecrement = (deps) => {
  deps.store.decrement({});
  deps.render();
};

export const handleToggle = (deps) => {
  deps.store.togglePanel({});
  deps.render();
};
