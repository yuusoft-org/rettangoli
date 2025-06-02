// todos.handlers.js
export const handleNewTodoKeyDown = (e, deps) => {
  if (e.key === 'Enter') {
    const input = e.target;
    const title = input.value.trim();
    if (title) {
      deps.store.addTodo(title);
      input.value = '';
      deps.render();
    }
  }
};

export const handleToggleAllClick = (e, deps) => {
  deps.store.toggleAll();
  deps.render();
};

export const handleTodoClick = (e, deps) => {
  const todoId = e.currentTarget.id.replace('todo-', '');
  deps.store.toggleTodo(todoId);
  deps.render();
};

export const handleDeleteClick = (e, deps) => {
  e.stopPropagation();
  const todoId = e.currentTarget.id.replace('delete-', '');
  deps.store.deleteTodo(todoId);
  deps.render();
};

export const handleClearCompletedClick = (e, deps) => {
  deps.store.clearCompleted();
  deps.render();
};

export const handleFilterClick = (e, deps) => {
  const filter = e.currentTarget.id.replace('filter-', '');
  deps.store.setFilter(filter);
  deps.render();
};