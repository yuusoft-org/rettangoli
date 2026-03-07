const getDismissResult = (store) => {
  const uiType = store.selectUiType();

  if (uiType === "dropdown" || uiType === "formDialog") {
    return null;
  }

  const config = store.selectConfig();
  if (config.mode === "confirm") {
    return false;
  }

  return null;
};

const closeCurrentUi = ({ store, render, globalUI, emitResult = false, result }) => {
  if (!store.selectIsOpen()) {
    return;
  }

  const resolvedResult = result !== undefined ? result : getDismissResult(store);
  store.closeAll();
  render();

  if (emitResult) {
    globalUI.emit("event", resolvedResult);
  }
};

const closeExistingUiBeforeShow = ({ store, render, globalUI }) => {
  if (store.selectIsOpen()) {
    closeCurrentUi({ store, render, globalUI, emitResult: true });
  }
};

const scheduleFormDialogMount = (deps, expectedKey) => {
  setTimeout(() => {
    const { store, refs } = deps;

    if (!store.selectIsOpen() || store.selectUiType() !== "formDialog") {
      return;
    }

    const formDialogConfig = store.selectFormDialogConfig?.();
    if (!formDialogConfig || formDialogConfig.key !== expectedKey) {
      return;
    }

    if (typeof formDialogConfig.mount !== "function") {
      return;
    }

    const formEl = refs.formDialog;
    if (!formEl) {
      return;
    }

    formDialogConfig.mount(formEl);
  }, 0);
};

export const handleDialogClose = (deps) => {
  const { store, render, globalUI } = deps;
  closeCurrentUi({ store, render, globalUI, emitResult: true });
};

export const handleConfirm = (deps) => {
  const { store, render, globalUI } = deps;
  const config = store.selectConfig();
  const result = config.mode === "confirm" ? true : null;

  closeCurrentUi({ store, render, globalUI, emitResult: true, result });
};

export const handleCancel = (deps) => {
  const { store, render, globalUI } = deps;
  closeCurrentUi({ store, render, globalUI, emitResult: true, result: false });
};

export const handleDropdownClose = (deps) => {
  const { store, render, globalUI } = deps;
  closeCurrentUi({ store, render, globalUI, emitResult: true, result: null });
};

export const handleDropdownItemClick = (deps, payload) => {
  const { store, render, globalUI } = deps;
  const event = payload._event;
  const { index, item } = event.detail;

  closeCurrentUi({
    store,
    render,
    globalUI,
    emitResult: true,
    result: { index, item },
  });
};

/**
 * Shows an alert dialog with the specified options.
 * Closes any existing dialog or dropdown before showing the alert.
 *
 * @param {Object} deps - Dependencies object
 * @param {Object} deps.store - The globalUI store instance
 * @param {Function} deps.render - Function to trigger re-rendering
 * @param {Object} payload - Alert configuration options
 * @param {string} payload.message - The alert message (required)
 * @param {string} [payload.title] - Optional alert title
 * @param {('info'|'warning'|'error')} [payload.status] - Optional status type
 * @param {string} [payload.confirmText] - Text for the confirm button (default: "OK")
 * @returns {Promise<void>}
 */
export const handleShowAlert = (deps, payload) => {
  const { store, render, globalUI } = deps;
  const options = payload;

  closeExistingUiBeforeShow({ store, render, globalUI });

  store.setAlertConfig(options);
  render();

  return new Promise((resolve) => {
    globalUI.once("event", () => {
      resolve();
    });
  });
};

export const handleShowConfirm = async (deps, payload) => {
  const { store, render, globalUI } = deps;
  const options = payload;

  closeExistingUiBeforeShow({ store, render, globalUI });

  store.setConfirmConfig(options);
  render();

  return new Promise((resolve) => {
    globalUI.once('event', (result) => {
      // result contains info of whehter is confirm of cancel
      resolve(result)
    });
  });
};

/**
 * Shows a dropdown menu at the specified position with the given items.
 * Closes any existing dialog or dropdown menu before showing the dropdown menu.
 *
 * @param {Object} deps - Dependencies object
 * @param {Object} deps.store - The globalUI store instance
 * @param {Function} deps.render - Function to trigger re-rendering
 * @param {Object} deps.globalUI - The globalUI event emitter
 * @param {Object} payload - Dropdown menu configuration options
 * @param {Array<Object>} payload.items - Array of dropdown menu items (required)
 * @param {number} payload.x - X coordinate position (required)
 * @param {number} payload.y - Y coordinate position (required)
 * @param {string} [payload.place] - Dropdown menu place token (default: "bs")
 * @returns {Promise<Object|null>} Promise that resolves with clicked item info or null if closed without selection
 * @returns {Object} [result.index] - Index of the clicked item
 * @returns {Object} [result.item] - The clicked item object
 */
export const handleShowDropdownMenu = async (deps, payload) => {
  const { store, render, globalUI } = deps;
  const options = payload;

  closeExistingUiBeforeShow({ store, render, globalUI });

  store.setDropdownConfig(options);
  render();

  return new Promise((resolve) => {
    globalUI.once('event', (result) => {
      // result contains info of clicked item or null if closed without selection
      resolve(result)
    });
  });
};

export const handleShowFormDialog = async (deps, payload) => {
  const { store, render, globalUI } = deps;
  const options = payload;

  closeExistingUiBeforeShow({ store, render, globalUI });

  store.setFormDialogConfig(options);
  render();

  const expectedKey = store.selectFormDialogConfig?.().key;
  scheduleFormDialogMount(deps, expectedKey);

  return new Promise((resolve) => {
    globalUI.once("event", (result) => {
      resolve(result);
    });
  });
};

export const handleFormAction = (deps, payload) => {
  const { store, render, globalUI } = deps;
  const detail = payload._event?.detail || {};

  if (detail.valid === false) {
    return;
  }

  closeCurrentUi({
    store,
    render,
    globalUI,
    emitResult: true,
    result: detail,
  });
};

export const handleFormFieldEvent = (deps, payload) => {
  const { store, refs } = deps;
  const detail = payload._event?.detail || {};
  const formDialogConfig = store.selectFormDialogConfig?.();

  if (typeof formDialogConfig?.onFieldEvent === "function") {
    formDialogConfig.onFieldEvent({
      detail,
      formEl: refs.formDialog || null,
    });
  }
};

/**
 * Triggers a global event to close all UI components.
 * This function will:
 * 1. Close any open global UI dialogs/dropdowns managed by the store
 * 2. Emit a global 'closeAll' event that other components can listen to
 *
 * @param {Object} deps - Dependencies object
 * @param {Object} deps.store - The globalUI store instance
 * @param {Function} deps.render - Function to trigger re-rendering
 * @param {Object} deps.globalUI - The globalUI event emitter
 * @returns {void}
 */
export const handleCloseAll = (deps) => {
  const { store, render, globalUI } = deps;
  closeCurrentUi({ store, render, globalUI, emitResult: true });
};
