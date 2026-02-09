export const handleAddCard = (deps) => {
  const input = deps.refs.addInput;
  if (input && input.value) {
    deps.store.addCard({ label: input.value });
    input.value = '';
    deps.render();
  }
};

export const handleAddKeydown = (deps, payload) => {
  const { _event: event } = payload;
  if (event.key === 'Enter') {
    const label = event.target.value.trim();
    if (label) {
      deps.store.addCard({ label });
      event.target.value = '';
      deps.render();
    }
  }
};

export const handleMoveCard = (deps, payload) => {
  const { _event: event } = payload;
  const id = event.currentTarget.dataset.cardId;
  if (id) {
    deps.store.moveCard({ id });
    deps.render();
  }
};

export const handleDeleteCard = (deps, payload) => {
  const { _event: event } = payload;
  const id = event.currentTarget.dataset.cardId;
  if (id) {
    deps.store.deleteCard({ id });
    deps.render();
  }
};
