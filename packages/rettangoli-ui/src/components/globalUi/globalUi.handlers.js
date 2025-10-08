export const handleDialogClose = (deps, payload) => {
  const { store, render } = deps;

  store.closeDialog();
  render();
};

export const handleConfirm = (deps, payload) => {
  const { store, render, globalUI } = deps;

  store.closeDialog();
  render();
  globalUI.emit('event', true);
};

export const handleCancel = (deps, payload) => {
  const { store, render, globalUI } = deps;

  store.closeDialog();
  render();
  globalUI.emit('event', false);
};

export const handleDropdownClose = (deps, payload) => {
  const { store, render, globalUI } = deps;

  // Only process close if the dropdown is currently open
  const uiType = store.selectUiType();
  const isOpen = store.selectIsOpen();

  if (uiType === 'dropdown' && isOpen) {
    store.closeDialog();
    render();
    globalUI.emit('event', null);
  }
};

export const handleDropdownItemClick = (deps, payload) => {
  const { store, render, globalUI } = deps;
  const event = payload._event;
  const index = parseInt(event.currentTarget.id.replace('dropdown-option-', ''));
  const item = store.selectDropdownConfig().items[index];

  // Only process click if the dropdown is currently open
  const uiType = store.selectUiType();
  const isOpen = store.selectIsOpen();

  if (uiType === 'dropdown' && isOpen) {
    store.closeDialog();
    render();
    globalUI.emit('event', { index, item });
  }
};

export const showAlert = (deps, payload) => {
  const { store, render } = deps;
  const options = payload;

  if (store.selectIsOpen()) {
    throw new Error("A dialog is already open");
  }

  store.setAlertConfig(options);
  render();
};

export const showConfirm = async (deps, payload) => {
  const { store, render, globalUI } = deps;
  const options = payload;

  if (store.selectIsOpen()) {
    throw new Error("A dialog is already open");
  }

  store.setConfirmConfig(options);
  render();

  return new Promise((resolve) => {
    globalUI.once('event', (result) => {
      // result contains info of whehter is confirm of cancel
      resolve(result)
    });
  });
};

export const showDropdown = async (deps, payload) => {
  const { store, render, globalUI } = deps;
  const options = payload;

  if (store.selectIsOpen()) {
    throw new Error("A dialog is already open");
  }

  store.setDropdownConfig(options);
  render();

  return new Promise((resolve) => {
    globalUI.once('event', (result) => {
      // result contains info of clicked item or null if closed without selection
      resolve(result)
    });
  });
};