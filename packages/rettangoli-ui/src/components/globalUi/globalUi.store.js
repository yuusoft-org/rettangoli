const VALID_DIALOG_SIZES = new Set(["sm", "md", "lg", "f"]);

const normalizeObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
};

const normalizeDialogSize = (value, fallback = "md") => {
  return VALID_DIALOG_SIZES.has(value) ? value : fallback;
};

export const createInitialState = () => Object.freeze({
  isOpen: false,
  uiType: "dialog", // "dialog" | "dropdown" | "formDialog"
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
    place: "bs",
  },
  formDialogConfig: {
    form: null,
    defaultValues: {},
    context: {},
    disabled: false,
    size: "md",
    key: 0,
    onFieldEvent: null,
    mount: null,
  },
});

export const setAlertConfig = ({ state }, options = {}) => {
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

export const setConfirmConfig = ({ state }, options = {}) => {
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

export const setDropdownConfig = ({ state }, options = {}) => {
  if (!options.items || !Array.isArray(options.items)) {
    throw new Error("items array is required for showDropdown");
  }

  state.dropdownConfig = {
    items: options.items,
    x: options.x || 0,
    y: options.y || 0,
    place: options.place || "bs",
  };
  state.uiType = "dropdown";
  state.isOpen = true;
};

export const setFormDialogConfig = ({ state }, options = {}) => {
  if (!options.form || typeof options.form !== "object" || Array.isArray(options.form)) {
    throw new Error("form object is required for showFormDialog");
  }

  const prevKey = state.formDialogConfig?.key || 0;

  state.formDialogConfig = {
    form: options.form,
    defaultValues: normalizeObject(options.defaultValues),
    context: normalizeObject(options.context),
    disabled: !!options.disabled,
    size: normalizeDialogSize(options.size, "md"),
    key: prevKey + 1,
    onFieldEvent: typeof options.onFieldEvent === "function" ? options.onFieldEvent : null,
    mount: typeof options.mount === "function" ? options.mount : null,
  };
  state.uiType = "formDialog";
  state.isOpen = true;
};

export const closeAll = ({ state }) => {
  state.isOpen = false;
  state.uiType = "dialog"; // Reset to default type
};

export const selectConfig = ({ state }) => state.config;
export const selectDropdownConfig = ({ state }) => state.dropdownConfig;
export const selectFormDialogConfig = ({ state }) => state.formDialogConfig;
export const selectUiType = ({ state }) => state.uiType;
export const selectIsOpen = ({ state }) => state.isOpen;

export const selectViewData = ({ state }) => {
  const isDialogOpen = state.isOpen && state.uiType === "dialog";
  const isFormDialogOpen = state.isOpen && state.uiType === "formDialog";

  return {
    isOpen: state.isOpen,
    uiType: state.uiType,
    config: state.config,
    dropdownConfig: {
      items: state.dropdownConfig?.items || [],
      x: state.dropdownConfig?.x || 0,
      y: state.dropdownConfig?.y || 0,
      place: state.dropdownConfig?.place || 'bs',
    },
    formDialogConfig: {
      form: state.formDialogConfig?.form || { fields: [], actions: { buttons: [] } },
      defaultValues: state.formDialogConfig?.defaultValues || {},
      context: state.formDialogConfig?.context || {},
      disabled: !!state.formDialogConfig?.disabled,
      size: normalizeDialogSize(state.formDialogConfig?.size, "md"),
      key: state.formDialogConfig?.key || 0,
    },
    isDialogOpen,
    isFormDialogOpen,
    isDialogContainerOpen: isDialogOpen || isFormDialogOpen,
    isDropdownOpen: state.isOpen && state.uiType === 'dropdown',
    dialogSize: isFormDialogOpen
      ? normalizeDialogSize(state.formDialogConfig?.size, "md")
      : "sm",
  };
};
