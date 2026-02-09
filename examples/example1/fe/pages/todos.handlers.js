// Handle adding a new todo on Enter key
export const handleNewTodoKeyDown = (deps, payload) => {
  const { _event: event } = payload;
  if (event.key === 'Enter') {
    const title = event.target.value.trim();
    if (title) {
      deps.store.addTodo({ title });
      event.target.value = '';
      deps.render();
    }
  }
};

// Handle toggling all todos
export const handleToggleAllClick = (deps) => {
  deps.store.toggleAll({});
  deps.render();
};

// Handle toggling a single todo
export const handleTodoClick = (deps, payload) => {
  const { _event: event } = payload;
  const todoId = event.currentTarget.dataset.todoId || event.currentTarget.id.slice('todo'.length);
  deps.store.toggleTodo({ id: todoId });
  deps.render();
};

// Handle deleting a todo
export const handleDeleteClick = (deps, payload) => {
  const { _event: event } = payload;
  event.stopPropagation();
  const todoId = event.currentTarget.dataset.todoId || event.currentTarget.id.slice('delete'.length);
  deps.store.deleteTodo({ id: todoId });
  deps.render();
};

// Handle clearing all completed todos
export const handleClearCompletedClick = (deps) => {
  deps.store.clearCompleted({});
  deps.render();
};

// Handle changing the filter
export const handleFilterClick = (deps, payload) => {
  const { _event: event } = payload;
  const rawFilter = event.currentTarget.id.slice('filter'.length);
  const filter = rawFilter.charAt(0).toLowerCase() + rawFilter.slice(1);
  deps.store.setFilter({ filter });
  deps.render();
};
