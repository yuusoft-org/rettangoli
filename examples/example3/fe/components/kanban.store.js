const COLORS = ['coral', 'royalblue', 'mediumseagreen', 'mediumpurple', 'goldenrod', 'teal'];

export const createInitialState = () => ({
  todoCards: [
    { id: '1', label: 'Design', color: 'coral' },
    { id: '2', label: 'Build', color: 'royalblue' },
  ],
  doingCards: [
    { id: '3', label: 'Test', color: 'mediumseagreen' },
  ],
  doneCards: [
    { id: '4', label: 'Plan', color: 'mediumpurple' },
  ],
  nextId: 5,
});

export const selectViewData = ({ state }) => ({
  todoCards: state.todoCards,
  doingCards: state.doingCards,
  doneCards: state.doneCards,
  todoCount: state.todoCards.length,
  doingCount: state.doingCards.length,
  doneCount: state.doneCards.length,
});

export const addCard = ({ state }, payload = {}) => {
  const { label = '' } = payload;
  if (!label.trim()) return;
  const color = COLORS[state.nextId % COLORS.length];
  state.todoCards.push({ id: String(state.nextId), label: label.trim(), color });
  state.nextId += 1;
};

export const moveCard = ({ state }, payload = {}) => {
  const { id } = payload;
  const todoIdx = state.todoCards.findIndex(c => c.id === id);
  if (todoIdx !== -1) {
    const [card] = state.todoCards.splice(todoIdx, 1);
    state.doingCards.push(card);
    return;
  }
  const doingIdx = state.doingCards.findIndex(c => c.id === id);
  if (doingIdx !== -1) {
    const [card] = state.doingCards.splice(doingIdx, 1);
    state.doneCards.push(card);
    return;
  }
};

export const deleteCard = ({ state }, payload = {}) => {
  const { id } = payload;
  state.todoCards = state.todoCards.filter(c => c.id !== id);
  state.doingCards = state.doingCards.filter(c => c.id !== id);
  state.doneCards = state.doneCards.filter(c => c.id !== id);
};
