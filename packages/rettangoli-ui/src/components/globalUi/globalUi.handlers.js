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

  // Always process close events - the framework will handle if it's already closed
  store.closeDialog();
  render();
  globalUI.emit('event', null);
};

export const handleDropdownItemClick = (deps, payload) => {
  const { store, render, globalUI } = deps;
  const event = payload._event;
  const { index, item } = event.detail;

  // Always process click events - the framework will handle if it's already closed
  store.closeDialog();
  render();
  globalUI.emit('event', { index, item });
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
 * @returns {void}
 */
export const showAlert = (deps, payload) => {
  const { store, render } = deps;
  const options = payload;

  // Close any existing dialog/dropdown menu first
  if (store.selectIsOpen()) {
    store.closeDialog();
    render();
  }

  store.setAlertConfig(options);
  render();
};

export const showConfirm = async (deps, payload) => {
  const { store, render, globalUI } = deps;
  const options = payload;

  // Close any existing dialog/dropdown menu first
  if (store.selectIsOpen()) {
    store.closeDialog();
    render();
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
 * @param {string} [payload.placement] - Dropdown menu placement (default: "bottom-start")
 * @returns {Promise<Object|null>} Promise that resolves with clicked item info or null if closed without selection
 * @returns {Object} [result.index] - Index of the clicked item
 * @returns {Object} [result.item] - The clicked item object
 */
export const showDropdownMenu = async (deps, payload) => {
  const { store, render, globalUI } = deps;
  const options = payload;

  // Close any existing dialog/dropdown menu first
  if (store.selectIsOpen()) {
    store.closeDialog();
    render();
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

/**
 * General-purpose function to close all currently open UI components.
 * This is a more generalized version that closes all floating UI elements.
 * This function will:
 * 1. Close any open global UI dialogs/dropdowns managed by the store
 * 2. Close all popover components (tooltips, selects, dropdown menus, etc.)
 * 3. Close any dialog elements that might be open
 *
 * @param {Object} deps - Dependencies object (optional, only used for GlobalUI store)
 * @returns {void}
 */
export const closeAll = (deps) => {
  const { store, render } = deps;
  if (store.selectIsOpen()) {
    store.closeDialog();
    render();
  }

  // Close all popover components (tooltips, selects, dropdown menus, etc.)
  const popovers = document.querySelectorAll('rtgl-popover[open]');
  popovers.forEach(popover => {
    popover.removeAttribute('open');
  });

  // Close all dialog components
  const dialogs = document.querySelectorAll('rtgl-dialog[open]');
  dialogs.forEach(dialog => {
    dialog.removeAttribute('open');
  });
};