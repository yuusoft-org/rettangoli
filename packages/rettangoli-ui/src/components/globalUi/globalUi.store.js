export const createInitialState = () => Object.freeze({
  isOpen: false,
  config: {
    status: undefined, // undefined | info | warning | error
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    mode: "alert", // alert | confirm
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
  state.isOpen = true;
};

export const closeDialog = (state) => {
  state.isOpen = false;
};

export const selectConfig = ({ state }) => state.config;
export const selectIsOpen = ({ state }) => state.isOpen;

export const selectViewData = ({ state }) => {
  return {
    isOpen: state.isOpen,
    config: state.config,
  };
};