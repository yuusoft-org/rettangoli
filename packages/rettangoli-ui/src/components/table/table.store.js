export const INITIAL_STATE = Object.freeze({
  sortColumn: null,
  sortDirection: null,
});

const blacklistedAttrs = ['id', 'class', 'style', 'slot'];

const stringifyAttrs = (attrs) => {
  return Object.entries(attrs).filter(([key]) => !blacklistedAttrs.includes(key)).map(([key, value]) => `${key}=${value}`).join(' ');
}

const getNestedValue = (obj, path) => {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return null;
    }
    result = result[key];
  }
  
  return result;
}

export const toViewData = ({ state, props, attrs }) => {
  const containerAttrString = stringifyAttrs(attrs);
  const data = props.data || { columns: [], rows: [] };
  
  // Transform rows to create cells array for easier template access
  const transformedRows = data.rows.map((row, rowIndex) => {
    const cells = data.columns.map(column => {
      const value = getNestedValue(row, column.key);
      return {
        key: column.key,
        value: value !== null && value !== undefined ? String(value) : ''
      };
    });
    
    return {
      index: rowIndex,
      cells: cells
    };
  });

  return {
    containerAttrString,
    columns: data.columns || [],
    rows: transformedRows || [],
  };
}

export const selectState = ({ state }) => {
  return state;
}

export const selectSortInfo = ({ state }) => {
  return {
    column: state.sortColumn,
    direction: state.sortDirection
  };
}

export const setSortColumn = (state, { column, direction }) => {
  state.sortColumn = column;
  state.sortDirection = direction;
}

export const clearSort = (state) => {
  state.sortColumn = null;
  state.sortDirection = null;
}