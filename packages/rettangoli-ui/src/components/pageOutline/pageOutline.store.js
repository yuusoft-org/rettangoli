export const createInitialState = () => Object.freeze({
  items: [],
  currentId: null,
  contentContainer: null
});

export const selectViewData = ({ state }) => {
  // Find all parent IDs for the current active item
  const getActiveParentIds = (items, currentId) => {
    const activeParentIds = new Set();
    const currentIndex = items.findIndex(item => item.id === currentId);

    if (currentIndex === -1) return activeParentIds;

    const currentLevel = items[currentIndex].level;

    // Look backwards for all parents (items with lower level)
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (items[i].level < currentLevel) {
        // This is a parent - mark all ancestors
        let ancestorLevel = items[i].level;
        activeParentIds.add(items[i].id);

        // Continue looking for grandparents
        for (let j = i - 1; j >= 0; j--) {
          if (items[j].level < ancestorLevel) {
            activeParentIds.add(items[j].id);
            ancestorLevel = items[j].level;
          }
        }
        break; // Found the immediate parent chain
      }
    }

    return activeParentIds;
  };

  const activeParentIds = getActiveParentIds(state.items, state.currentId);

  return {
    items: state.items.map((item) => {
      const mlValues = {
        1: '0',
        2: '12px',
        3: '24px',
        4: '32px'
      };

      const isDirectlyActive = item.id === state.currentId;
      const isParentActive = activeParentIds.has(item.id);
      const active = isDirectlyActive || isParentActive;

      return {
        ...item,
        c: active ? 'fg' : 'mu-fg',
        ml: mlValues[item.level] || '',
        bc: active ? "fg" : "mu-fg"
      }
    }),
    currentId: state.currentId
  };
}

export const selectState = ({ state }) => {
  return state;
}

export const selectCurrentId = ({ state }) => {
  return state.currentId;
}

export const setItems = ({ state }, payload = {}) => {
  state.items = Array.isArray(payload.items) ? payload.items : [];
}

export const setCurrentId = ({ state }, payload = {}) => {
  state.currentId = payload.id;
}

export const setContentContainer = ({ state }, payload = {}) => {
  state.contentContainer = payload.container;
}


