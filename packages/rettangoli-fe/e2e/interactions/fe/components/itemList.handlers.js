export const handleAddItem = (deps) => {
  const input = deps.refs.itemInput;
  if (input && input.value) {
    deps.store.addItem({ name: input.value });
    input.value = '';
    deps.render();
  }
};

export const handleInputKeydown = (deps, payload) => {
  const { _event: event } = payload;
  if (event.key === 'Enter') {
    const name = event.target.value.trim();
    if (name) {
      deps.store.addItem({ name });
      event.target.value = '';
      deps.render();
    }
  }
};

export const handleRemoveItem = (deps, payload) => {
  const { _event: event } = payload;
  const id = event.currentTarget.dataset.itemId;
  if (id) {
    deps.store.removeItem({ id });
    deps.render();
  }
};

export const handleFilterAll = (deps) => {
  deps.store.setFilter({ filter: 'all' });
  deps.render();
};

export const handleFilterRed = (deps) => {
  deps.store.setFilter({ filter: 'red' });
  deps.render();
};

export const handleFilterBlue = (deps) => {
  deps.store.setFilter({ filter: 'blue' });
  deps.render();
};
