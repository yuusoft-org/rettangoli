// Handle adding a new todo on Enter key
export const handleNewTodoKeyDown = (deps, event) => {
  if (event.key === 'Enter') {
    const title = event.target.value.trim();
    if (title) {
      deps.store.addTodo(title);
      event.target.value = '';
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
export const handleTodoClick = (deps, event) => {
  deps.store.toggleTodo(event.currentTarget.id.replace('todo-', ''));
  deps.render();
};

// Handle deleting a todo
export const handleDeleteClick = (deps, event) => {
  event.stopPropagation();
  deps.store.deleteTodo(event.currentTarget.id.replace('delete-', ''));
  deps.render();
};

// Handle clearing all completed todos
export const handleClearCompletedClick = (_, deps) => {
  deps.store.clearCompleted();
  deps.render();
};

// Handle changing the filter
export const handleFilterClick = (deps, event) => {
  deps.store.setFilter(event.currentTarget.id.replace('filter-', ''));
  deps.render();
};