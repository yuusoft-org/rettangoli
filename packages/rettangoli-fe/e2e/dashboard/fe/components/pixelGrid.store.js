const PALETTE = ['gray', 'tomato', 'dodgerblue', 'mediumseagreen', 'gold', 'orchid'];

export const createInitialState = () => ({
  cells: Array(64).fill(null).map((_, i) => ({ id: String(i), color: 'white' })),
  selectedColor: 'gray',
});

export const selectViewData = ({ state }) => ({
  cells: state.cells,
  paintedCount: state.cells.filter(c => c.color !== 'white').length,
  palette: PALETTE.map(color => ({
    color,
    border: color === state.selectedColor ? '3px solid black' : '1px solid #ccc',
  })),
});

export const paintCell = ({ state }, payload = {}) => {
  const { id } = payload;
  const idx = parseInt(id, 10);
  if (idx >= 0 && idx < 64) {
    state.cells[idx].color = state.selectedColor;
  }
};

export const selectColor = ({ state }, payload = {}) => {
  const { color } = payload;
  if (color) state.selectedColor = color;
};

export const clearAll = ({ state }) => {
  state.cells.forEach(cell => { cell.color = 'white'; });
};
