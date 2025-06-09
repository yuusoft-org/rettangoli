// Handle adding a new todo on Enter key
export const handleNewTodoKeyDown = (e, deps) => {
  if (e.key === 'Enter') {
    const title = e.target.value.trim();
    if (title) {
      deps.store.addTodo(title);
      e.target.value = '';
      deps.render();
    }
  }
};

// Handle toggling all todos
export const handleToggleAllClick = (_, deps) => {
  deps.store.toggleAll();
  deps.render();
};

// Handle toggling a single todo
export const handleTodoClick = (e, deps) => {
  deps.store.toggleTodo(e.currentTarget.id.replace('todo-', ''));
  deps.render();
};

// Handle deleting a todo
export const handleDeleteClick = (e, deps) => {
  e.stopPropagation();
  deps.store.deleteTodo(e.currentTarget.id.replace('delete-', ''));
  deps.render();
};

// Handle clearing all completed todos
export const handleClearCompletedClick = (_, deps) => {
  deps.store.clearCompleted();
  deps.render();
};

// Handle changing the filter
export const handleFilterClick = (e, deps) => {
  deps.store.setFilter(e.currentTarget.id.replace('filter-', ''));
  deps.render();
};