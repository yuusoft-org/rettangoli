export const createInitialState = () => ({
  items: [],
  filter: 'all',
  nextId: 1,
});

export const selectViewData = ({ state }) => {
  const filteredItems = state.items.filter(item => {
    if (state.filter === 'all') return true;
    return item.type === state.filter;
  });
  return {
    items: filteredItems,
    isEmpty: filteredItems.length === 0,
    itemCount: filteredItems.length,
    barWidth: Math.min(filteredItems.length * 30, 180),
    filterAllStyle: state.filter === 'all' ? 'background:steelblue;color:white' : 'background:#ddd',
    filterRedStyle: state.filter === 'red' ? 'background:salmon;color:white' : 'background:#ddd',
    filterBlueStyle: state.filter === 'blue' ? 'background:cornflowerblue;color:white' : 'background:#ddd',
  };
};

export const addItem = ({ state }, payload = {}) => {
  const { name = '' } = payload;
  if (!name.trim()) return;
  const type = state.nextId % 2 === 1 ? 'red' : 'blue';
  const color = type === 'red' ? 'salmon' : 'cornflowerblue';
  state.items.push({ id: String(state.nextId), name: name.trim(), type, color });
  state.nextId += 1;
};

export const removeItem = ({ state }, payload = {}) => {
  const { id } = payload;
  state.items = state.items.filter(item => item.id !== id);
};

export const setFilter = ({ state }, payload = {}) => {
  const { filter } = payload;
  state.filter = filter;
};
