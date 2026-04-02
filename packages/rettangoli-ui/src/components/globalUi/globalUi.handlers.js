const clearComponentDialogBody = (refs) => {
  if (!refs) {
    return;
  }

  if (typeof refs.componentDialogBodyHost?.replaceChildren === "function") {
    refs.componentDialogBodyHost.replaceChildren();
  }

  delete refs.componentDialogBody;
};

const getDismissResult = (store) => {
  const uiType = store.selectUiType();

  if (uiType === "dropdown" || uiType === "formDialog" || uiType === "componentDialog") {
    return null;
  }

  const config = store.selectConfig();
  if (config.mode === "confirm") {
    return false;
  }

  return null;
};

const closeCurrentUi = ({ store, render, globalUI, refs, emitResult = false, result }) => {
  if (!store.selectIsOpen()) {
    return;
  }

  const resolvedResult = result !== undefined ? result : getDismissResult(store);
  clearComponentDialogBody(refs);
  store.closeAll();
  render();

  if (emitResult) {
    globalUI.emit("event", resolvedResult);
  }
};

const rejectCurrentUi = ({ store, render, globalUI, refs, error }) => {
  clearComponentDialogBody(refs);

  if (store.selectIsOpen()) {
    store.closeAll();
    render();
  }

  globalUI.emit("error", error);
};

const closeExistingUiBeforeShow = ({ store, render, globalUI, refs }) => {
  if (store.selectIsOpen()) {
    closeCurrentUi({ store, render, globalUI, refs, emitResult: true });
  }
};

const createUiPromise = (globalUI, { rejectOnError = false } = {}) => {
  return new Promise((resolve, reject) => {
    let offError = null;
    const offEvent = globalUI.once("event", (result) => {
      offError?.();
      resolve(result);
    });

    if (rejectOnError) {
      offError = globalUI.once("error", (error) => {
        offEvent?.();
        reject(error);
      });
    }
  });
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

const scheduleComponentDialogMount = (deps, expectedKey) => {
  setTimeout(() => {
    const { store, refs, render, globalUI } = deps;

    if (!store.selectIsOpen() || store.selectUiType() !== "componentDialog") {
      return;
    }

    const componentDialogConfig = store.selectComponentDialogConfig?.();
    if (!componentDialogConfig || componentDialogConfig.key !== expectedKey) {
      return;
    }

    const hostEl = refs.componentDialogBodyHost;
    if (!hostEl) {
      return;
    }

    try {
      const bodyEl = document.createElement(componentDialogConfig.component);

      Object.entries(componentDialogConfig.props ?? {}).forEach(([key, value]) => {
        bodyEl[key] = value;
      });

      hostEl.replaceChildren(bodyEl);
      refs.componentDialogBody = bodyEl;
    } catch (error) {
      rejectCurrentUi({ store, render, globalUI, refs, error });
    }
  }, 0);
};

const isActiveComponentDialog = (store, expectedKey) => {
  if (!store.selectIsOpen() || store.selectUiType() !== "componentDialog") {
    return false;
  }

  const componentDialogConfig = store.selectComponentDialogConfig?.();
  return componentDialogConfig?.key === expectedKey;
};

export const handleDialogClose = (deps) => {
  const { store, render, globalUI, refs } = deps;
  closeCurrentUi({ store, render, globalUI, refs, emitResult: true });
};

export const handleConfirm = (deps) => {
  const { store, render, globalUI, refs } = deps;
  const config = store.selectConfig();
  const result = config.mode === "confirm" ? true : null;

  closeCurrentUi({ store, render, globalUI, refs, emitResult: true, result });
};

export const handleCancel = (deps) => {
  const { store, render, globalUI, refs } = deps;
  closeCurrentUi({ store, render, globalUI, refs, emitResult: true, result: false });
};

export const handleDropdownClose = (deps) => {
  const { store, render, globalUI, refs } = deps;
  closeCurrentUi({ store, render, globalUI, refs, emitResult: true, result: null });
};

export const handleDropdownItemClick = (deps, payload) => {
  const { store, render, globalUI, refs } = deps;
  const event = payload._event;
  const { index, item } = event.detail;

  closeCurrentUi({
    store,
    render,
    globalUI,
    refs,
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
  const { store, render, globalUI, refs } = deps;
  const options = payload;

  closeExistingUiBeforeShow({ store, render, globalUI, refs });

  store.setAlertConfig(options);
  render();

  return createUiPromise(globalUI);
};

export const handleShowConfirm = async (deps, payload) => {
  const { store, render, globalUI, refs } = deps;
  const options = payload;

  closeExistingUiBeforeShow({ store, render, globalUI, refs });

  store.setConfirmConfig(options);
  render();

  return createUiPromise(globalUI);
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
  const { store, render, globalUI, refs } = deps;
  const options = payload;

  closeExistingUiBeforeShow({ store, render, globalUI, refs });

  store.setDropdownConfig(options);
  render();

  return createUiPromise(globalUI);
};

export const handleShowFormDialog = async (deps, payload) => {
  const { store, render, globalUI, refs } = deps;
  const options = payload;

  closeExistingUiBeforeShow({ store, render, globalUI, refs });

  store.setFormDialogConfig(options);
  render();

  const expectedKey = store.selectFormDialogConfig?.().key;
  scheduleFormDialogMount(deps, expectedKey);

  return createUiPromise(globalUI);
};

export const handleShowComponentDialog = async (deps, payload) => {
  const { store, render, globalUI, refs } = deps;
  const options = payload;

  closeExistingUiBeforeShow({ store, render, globalUI, refs });

  store.setComponentDialogConfig(options);
  render();

  const expectedKey = store.selectComponentDialogConfig?.().key;
  scheduleComponentDialogMount(deps, expectedKey);

  return createUiPromise(globalUI, { rejectOnError: true });
};

export const handleFormAction = (deps, payload) => {
  const { store, render, globalUI, refs } = deps;
  const detail = payload._event?.detail ?? {};

  if (detail.valid === false) {
    return;
  }

  closeCurrentUi({
    store,
    render,
    globalUI,
    refs,
    emitResult: true,
    result: detail,
  });
};

export const handleFormFieldEvent = (deps, payload) => {
  const { store, refs } = deps;
  const detail = payload._event?.detail ?? {};
  const formDialogConfig = store.selectFormDialogConfig?.();

  if (typeof formDialogConfig?.onFieldEvent === "function") {
    formDialogConfig.onFieldEvent({
      detail,
      formEl: refs.formDialog ?? null,
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
  const { store, render, globalUI, refs } = deps;
  closeCurrentUi({ store, render, globalUI, refs, emitResult: true });
};

export const handleComponentDialogAction = async (deps, payload) => {
  const { store, render, globalUI, refs } = deps;
  const event = payload._event;
  const actionIndex = Number(event?.currentTarget?.dataset?.actionIndex);
  const componentDialogConfig = store.selectComponentDialogConfig?.();
  const componentDialogKey = componentDialogConfig?.key;
  const button = Number.isInteger(actionIndex)
    ? componentDialogConfig?.actions?.buttons?.[actionIndex]
    : null;

  if (!button) {
    return;
  }

  if (button.role === "cancel") {
    closeCurrentUi({
      store,
      render,
      globalUI,
      refs,
      emitResult: true,
      result: {
        actionId: button.id,
      },
    });
    return;
  }

  try {
    const body = refs.componentDialogBody;
    if (!body || typeof body.validate !== "function" || typeof body.getValues !== "function") {
      throw new Error(
        `component dialog body '${componentDialogConfig?.component ?? "unknown"}' must implement validate() and getValues()`,
      );
    }

    if (button.validate) {
      const validation = await body.validate();
      if (!isActiveComponentDialog(store, componentDialogKey)) {
        return;
      }

      if (!validation || typeof validation !== "object" || typeof validation.valid !== "boolean") {
        throw new Error("component dialog body validate() must return { valid, errors? }");
      }
      if (validation.valid === false) {
        return;
      }
    }

    const values = await body.getValues();
    if (!isActiveComponentDialog(store, componentDialogKey)) {
      return;
    }

    closeCurrentUi({
      store,
      render,
      globalUI,
      refs,
      emitResult: true,
      result: {
        actionId: button.id,
        values,
      },
    });
  } catch (error) {
    if (!isActiveComponentDialog(store, componentDialogKey)) {
      return;
    }

    rejectCurrentUi({ store, render, globalUI, refs, error });
  }
};
