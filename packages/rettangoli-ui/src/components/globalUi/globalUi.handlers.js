export const handleDialogClose = (_, deps) => {
  const { store, render, dispatchEvent } = deps;
  const config = store.selectConfig();
  
  store.closeDialog();
  
  // Dispatch event with result
  if (dispatchEvent) {
    dispatchEvent(new CustomEvent('globalui-closed', {
      detail: { 
        result: config.mode === "confirm" ? false : undefined 
      },
      bubbles: true
    }));
  }
  
  render();
};

export const handleConfirm = (_, deps) => {
  const { store, render, dispatchEvent } = deps;
  const config = store.selectConfig();
  
  store.closeDialog();
  
  // Dispatch event with result
  if (dispatchEvent) {
    dispatchEvent(new CustomEvent('globalui-closed', {
      detail: { 
        result: config.mode === "confirm" ? true : undefined 
      },
      bubbles: true
    }));
  }
  
  render();
};

export const handleCancel = (_, deps) => {
  const { store, render, dispatchEvent } = deps;
  
  store.closeDialog();
  
  // Dispatch event with result
  if (dispatchEvent) {
    dispatchEvent(new CustomEvent('globalui-closed', {
      detail: { result: false },
      bubbles: true
    }));
  }
  
  render();
};

export const showAlert = async (options, deps) => {
  const { store, render } = deps;
  
  // If dialog is already open, reject
  if (store.selectIsOpen()) {
    throw new Error("A dialog is already open");
  }
  
  store.setAlertConfig(options);
  render();
  
  // Return promise that resolves when dialog closes
  return new Promise((resolve) => {
    const handler = (event) => {
      document.removeEventListener('globalui-closed', handler);
      resolve(event.detail.result);
    };
    document.addEventListener('globalui-closed', handler);
  });
};

export const showConfirm = async (options, deps) => {
  const { store, render } = deps;
  
  // If dialog is already open, reject
  if (store.selectIsOpen()) {
    throw new Error("A dialog is already open");
  }
  
  store.setConfirmConfig(options);
  render();
  
  // Return promise that resolves when dialog closes
  return new Promise((resolve) => {
    const handler = (event) => {
      document.removeEventListener('globalui-closed', handler);
      resolve(event.detail.result);
    };
    document.addEventListener('globalui-closed', handler);
  });
};