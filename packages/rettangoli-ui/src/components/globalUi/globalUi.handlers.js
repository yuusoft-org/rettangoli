export const handleDialogClose = (_, deps) => {
  const { store, render } = deps;
  const resolve = store.selectPromiseResolve();
  const dialogMode = store.selectDialogMode();
  const queue = store.selectQueue();
  const next = queue && queue.length > 0 ? queue[0] : null;
  
  store.closeDialog();
  
  if (resolve) {
    resolve(dialogMode === "confirm" ? false : undefined);
  }
  
  // Process next in queue
  if (next) {
    store.shiftQueue();
    if (next.type === 'alert') {
      store.setAlertConfig({ options: next.options, resolve: next.resolve });
    } else if (next.type === 'confirm') {
      store.setConfirmConfig({ options: next.options, resolve: next.resolve });
    }
  }
  
  render();
};

export const handleConfirm = (_, deps) => {
  const { store, render } = deps;
  const resolve = store.selectPromiseResolve();
  const dialogMode = store.selectDialogMode();
  const queue = store.selectQueue();
  const next = queue && queue.length > 0 ? queue[0] : null;
  
  store.closeWithConfirm();
  
  if (resolve) {
    resolve(dialogMode === "confirm" ? true : undefined);
  }
  
  // Process next in queue
  if (next) {
    store.shiftQueue();
    if (next.type === 'alert') {
      store.setAlertConfig({ options: next.options, resolve: next.resolve });
    } else if (next.type === 'confirm') {
      store.setConfirmConfig({ options: next.options, resolve: next.resolve });
    }
  }
  
  render();
};

export const handleCancel = (_, deps) => {
  const { store, render } = deps;
  const resolve = store.selectPromiseResolve();
  const queue = store.selectQueue();
  const next = queue && queue.length > 0 ? queue[0] : null;
  
  store.closeWithCancel();
  
  if (resolve) {
    resolve(false);
  }
  
  // Process next in queue
  if (next) {
    store.shiftQueue();
    if (next.type === 'alert') {
      store.setAlertConfig({ options: next.options, resolve: next.resolve });
    } else if (next.type === 'confirm') {
      store.setConfirmConfig({ options: next.options, resolve: next.resolve });
    }
  }
  
  render();
};

export const showAlert = async (options, deps) => {
  const { store, render } = deps;
  
  return new Promise((resolve) => {
    // If dialog is already open, queue this request
    if (store.selectPromiseResolve() !== null) {
      // Store both the options and resolver in queue
      store.addToQueue({ type: 'alert', options, resolve });
    } else {
      store.setAlertConfig({ options, resolve });
      render();
    }
  });
};

export const showConfirm = async (options, deps) => {
  const { store, render } = deps;
  
  return new Promise((resolve) => {
    // If dialog is already open, queue this request
    if (store.selectPromiseResolve() !== null) {
      // Store both the options and resolver in queue
      store.addToQueue({ type: 'confirm', options, resolve });
    } else {
      store.setConfirmConfig({ options, resolve });
      render();
    }
  });
};