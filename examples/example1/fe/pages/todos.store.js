export const createInitialState = () => ({
  title: "todos",
  placeholderText: "What needs to be done?",
  filter: 'all', // 'all', 'active', 'completed'
  todos: [
    {
      id: '1',
      title: 'Todo 1',
      completed: false,
    },
    {
      id: '2',
      title: 'Todo 2',
      completed: true,
    }
  ],
});

export const selectViewData = ({ state }) => {
  const activeCount = state.todos.filter(todo => !todo.completed).length;
  const completedCount = state.todos.filter(todo => todo.completed).length;
  const filteredTodos = state.todos.filter(todo => {
    if (state.filter === 'active') return !todo.completed;
    if (state.filter === 'completed') return todo.completed;
    return true;
  });

  return {
    ...state,
    activeCount,
    completedCount,
    filteredTodos,
    allCompleted: state.todos.length > 0 && state.todos.every(todo => todo.completed),
    itemText: activeCount === 1 ? 'item' : 'items',
    showClearCompleted: completedCount > 0,
    isAllFilter: state.filter === 'all',
    isActiveFilter: state.filter === 'active',
    isCompletedFilter: state.filter === 'completed',
  };
};

// Add a new todo
export const addTodo = (state, title) => {
  if (!title.trim()) return;
  const newTodo = {
    id: Date.now().toString(),
    title: title.trim(),
    completed: false,
  };
  state.todos.push(newTodo);
};

// Toggle completion for a todo by id
export const toggleTodo = (state, id) => {
  state.todos.forEach(todo => {
    if (todo.id === id) {
      todo.completed = !todo.completed;
    }
  });
};

// Action: Toggle all todos
export const toggleAll = (state) => {
  const allCompleted = state.todos.every(todo => todo.completed);
  state.todos.forEach(todo => {
    todo.completed = !allCompleted;
  });
};

// Action: Delete todo
export const deleteTodo = (state, id) => {
  state.todos = state.todos.filter(todo => todo.id !== id);
};

// Action: Clear completed todos
export const clearCompleted = (state) => {
  state.todos = state.todos.filter(todo => !todo.completed);
};

// Action: Set filter
export const setFilter = (state, filter) => {
  state.filter = filter;
};