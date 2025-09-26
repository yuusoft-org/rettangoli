// Pure handlers - no side effects

export const handleDialogClose = (_, deps) => {
  const { store, render } = deps;
  
  store.closeDialog();
  render();
};

export const handleConfirm = (_, deps) => {
  const { store, render } = deps;
  
  store.setResult(true);
  store.closeDialog();
  render();
};

export const handleCancel = (_, deps) => {
  const { store, render } = deps;
  
  store.setResult(false);
  store.closeDialog();
  render();
};

export const showAlert = (options, deps) => {
  const { store, render } = deps;
  
  if (store.selectIsOpen()) {
    throw new Error("A dialog is already open");
  }
  
  store.setAlertConfig(options);
  store.setResult(undefined);
  render();
  
  // Return store reference for application to poll if needed
  return { 
    isOpen: () => store.selectIsOpen(),
    getResult: () => store.selectResult()
  };
};

export const showConfirm = (options, deps) => {
  const { store, render } = deps;
  
  if (store.selectIsOpen()) {
    throw new Error("A dialog is already open");
  }
  
  store.setConfirmConfig(options);
  store.setResult(undefined);
  render();
  
  // Return store reference for application to poll if needed
  return {
    isOpen: () => store.selectIsOpen(),
    getResult: () => store.selectResult()
  };
};