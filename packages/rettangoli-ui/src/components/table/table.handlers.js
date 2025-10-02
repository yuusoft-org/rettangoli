export const handleBeforeMount = (deps) => {
  // No special initialization needed for basic table
};

export const handleRowClick = (deps, event) => {
  const { dispatchEvent, props } = deps;
  const rowIndex = parseInt(event.currentTarget.id.replace("row-", ""));
  const rowData = props.data?.rows?.[rowIndex];

  if (rowData) {
    dispatchEvent(
      new CustomEvent("row-click", {
        detail: {
          rowIndex,
          rowData,
        },
      }),
    );
  }
};

export const handleHeaderClick = (deps, event) => {
  const { store, render, dispatchEvent } = deps;
  const columnKey = event.currentTarget.id.replace("header-", "");
  const currentSort = store.selectSortInfo();

  // Determine new sort direction
  let newDirection = 'asc';
  if (currentSort.column === columnKey) {
    if (currentSort.direction === 'asc') {
      newDirection = 'desc';
    } else if (currentSort.direction === 'desc') {
      newDirection = null; // Clear sort
    }
  }

  if (newDirection) {
    store.setSortColumn({ column: columnKey, direction: newDirection });
  } else {
    store.clearSort();
  }

  render();

  // Dispatch custom event for external handling
  dispatchEvent(
    new CustomEvent("header-click", {
      detail: {
        column: columnKey,
        direction: newDirection,
        sortInfo: newDirection ? { column: columnKey, direction: newDirection } : null,
      },
    }),
  );
};