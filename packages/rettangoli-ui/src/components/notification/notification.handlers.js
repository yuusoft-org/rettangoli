export const handleBeforeMount = (deps) => {
  const { store, render } = deps;
  console.log('AAAAAAAAAAAAAAAAA')
};

export const handleDialogClose = (e, deps) => {
  const { store, render } = deps;
  store.closeDialog();
  render();
};

export const handleConfirm = (e, deps) => {
  const { store, render } = deps;
  const config = store.selectConfig();

  if (config.onConfirm) {
    config.onConfirm();
  }

  store.closeDialog();
  render();
};

export const showConfirm = (payload, deps) => {
  const { store, render } = deps;
  store.showConfirm(payload.message)
  render();
}

export const handleCancel = (e, deps) => {
  const { store, render } = deps;
  const config = store.selectConfig();

  if (config.onCancel) {
    config.onCancel();
  }

  store.closeDialog();
  render();
};
