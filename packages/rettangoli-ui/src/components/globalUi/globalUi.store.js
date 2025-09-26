export const INITIAL_STATE = Object.freeze({
  isOpen: false,
  config: {
    status: undefined, // undefined | info | warning | error
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    mode: "alert", // alert | confirm
  },
  promiseResolve: null,
  dialogMode: null,
  queue: [],
});

export const setAlertConfig = (state, payload) => {
  const { options, resolve } = payload;
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
  state.promiseResolve = resolve;
  state.dialogMode = "alert";
  state.isOpen = true;
};

export const setConfirmConfig = (state, payload) => {
  const { options, resolve } = payload;
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
  state.promiseResolve = resolve;
  state.dialogMode = "confirm";
  state.isOpen = true;
};

export const closeWithConfirm = (state) => {
  state.isOpen = false;
  state.promiseResolve = null;
  state.dialogMode = null;
};

export const closeWithCancel = (state) => {
  state.isOpen = false;
  state.promiseResolve = null;
  state.dialogMode = null;
};

export const closeDialog = (state) => {
  state.isOpen = false;
  state.promiseResolve = null;
  state.dialogMode = null;
};

export const addToQueue = (state, fn) => {
  state.queue.push(fn);
};

export const shiftQueue = (state) => {
  state.queue.shift();
};

export const selectConfig = ({ state }) => state.config;
export const selectIsOpen = ({ state }) => state.isOpen;
export const selectPromiseResolve = ({ state }) => state.promiseResolve;
export const selectDialogMode = ({ state }) => state.dialogMode;
export const selectQueue = ({ state }) => state.queue;

export const toViewData = ({ state }) => {
  return {
    isOpen: state.isOpen,
    config: state.config,
  };
};