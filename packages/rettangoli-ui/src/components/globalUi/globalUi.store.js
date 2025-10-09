export const createInitialState = () => Object.freeze({
  isOpen: false,
  uiType: "dialog", // "dialog" | "dropdown"
  config: {
    status: undefined, // undefined | info | warning | error
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    mode: "alert", // alert | confirm
  },
  dropdownConfig: {
    items: [],
    x: 0,
    y: 0,
    placement: "bottom-start",
  },
});

export const setAlertConfig = (state, options) => {
  if (!options.message) {
    throw new Error("message is required for showAlert");
  }

  state.config = {
    status: options.status || undefined,
    title: options.title || "",
    message: options.message,
    confirmText: options.confirmText || "OK",
    cancelText: "",
    mode: "alert",
  };
  state.uiType = "dialog";
  state.isOpen = true;
};

export const setConfirmConfig = (state, options) => {
  if (!options.message) {
    throw new Error("message is required for showConfirm");
  }

  state.config = {
    status: options.status || undefined,
    title: options.title || "",
    message: options.message,
    confirmText: options.confirmText || "Yes",
    cancelText: options.cancelText || "Cancel",
    mode: "confirm",
  };
  state.uiType = "dialog";
  state.isOpen = true;
};

export const setDropdownConfig = (state, options) => {
  if (!options.items || !Array.isArray(options.items)) {
    throw new Error("items array is required for showDropdown");
  }

  state.dropdownConfig = {
    items: options.items,
    x: options.x || 0,
    y: options.y || 0,
    placement: options.placement || "bottom-start",
  };
  state.uiType = "dropdown";
  state.isOpen = true;
};

export const closeDialog = (state) => {
  state.isOpen = false;
  state.uiType = "dialog"; // Reset to default type
};

export const selectConfig = ({ state }) => state.config;
export const selectDropdownConfig = ({ state }) => state.dropdownConfig;
export const selectUiType = ({ state }) => state.uiType;
export const selectIsOpen = ({ state }) => state.isOpen;

export const selectViewData = ({ state }) => {
  return {
    isOpen: state.isOpen,
    uiType: state.uiType,
    config: state.config,
    dropdownConfig: {
      items: state.dropdownConfig?.items || [],
      x: state.dropdownConfig?.x || 0,
      y: state.dropdownConfig?.y || 0,
      placement: state.dropdownConfig?.placement || 'bottom-start',
    },
    isDialogOpen: state.isOpen && state.uiType === 'dialog',
    isDropdownOpen: state.isOpen && state.uiType === 'dropdown',
  };
};