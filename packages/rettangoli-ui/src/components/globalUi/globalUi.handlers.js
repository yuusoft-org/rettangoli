export const handleDialogClose = (_, deps) => {
  const { store, render } = deps;
  
  store.closeDialog();
  render();
};

export const handleConfirm = (_, deps) => {
  const { store, render, globalUI } = deps;
  
  store.closeDialog();
  render();
  globalUI.emit('event', true);
};

export const handleCancel = (_, deps) => {
  const { store, render, globalUI } = deps;

  store.closeDialog();
  render();
  globalUI.emit('event', false);
};

export const showAlert = (options, deps) => {
  const { store, render } = deps;
  
  if (store.selectIsOpen()) {
    throw new Error("A dialog is already open");
  }
  
  store.setAlertConfig(options);
  render();
};

export const showConfirm = async (options, deps) => {
  const { store, render, globalUI } = deps;
  
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