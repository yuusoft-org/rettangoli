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