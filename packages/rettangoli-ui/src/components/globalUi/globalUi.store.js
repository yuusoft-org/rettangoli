const VALID_DIALOG_SIZES = new Set(["sm", "md", "lg", "f"]);
const VALID_COMPONENT_DIALOG_ROLES = new Set(["confirm", "cancel"]);

const DEFAULT_COMPONENT_DIALOG_BUTTONS = Object.freeze([
  {
    id: "cancel",
    label: "Cancel",
    variant: "se",
    align: "left",
    role: "cancel",
  },
  {
    id: "confirm",
    label: "OK",
    variant: "pr",
    role: "confirm",
    validate: true,
  },
]);

const normalizeObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
};

const normalizeDialogSize = (value, fallback = "md") => {
  return VALID_DIALOG_SIZES.has(value) ? value : fallback;
};

const normalizeComponentDialogActions = (value) => {
  const sourceButtons = Array.isArray(value?.buttons) && value.buttons.length > 0
    ? value.buttons
    : DEFAULT_COMPONENT_DIALOG_BUTTONS;

  const buttons = sourceButtons.map((button, index) => {
    if (!button || typeof button !== "object" || Array.isArray(button)) {
      throw new Error("component dialog buttons must be objects");
    }

    if (typeof button.id !== "string" || button.id.length === 0) {
      throw new Error("component dialog button id is required");
    }

    if (typeof button.label !== "string" || button.label.length === 0) {
      throw new Error("component dialog button label is required");
    }

    if (!VALID_COMPONENT_DIALOG_ROLES.has(button.role)) {
      throw new Error("component dialog button role must be 'confirm' or 'cancel'");
    }

    return {
      ...button,
      _globalIdx: index,
      variant: button.variant || (button.role === "confirm" ? "pr" : "se"),
      align: button.align || (button.role === "cancel" ? "left" : "right"),
      validate: button.role === "confirm" ? !!button.validate : false,
      _disabled: !!button.disabled,
      pre: button.pre || "",
      suf: button.suf || "",
    };
  });

  return {
    _layout: "split",
    buttons,
    _leftButtons: buttons.filter((button) => button.align === "left"),
    _rightButtons: buttons.filter((button) => button.align !== "left"),
  };
};

const createDefaultComponentDialogConfig = () => ({
  title: "",
  description: "",
  size: "md",
  component: "",
  props: {},
  actions: normalizeComponentDialogActions(),
  key: 0,
});

export const createInitialState = () => Object.freeze({
  isOpen: false,
  uiType: "dialog", // "dialog" | "dropdown" | "formDialog" | "componentDialog"
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
  componentDialogConfig: createDefaultComponentDialogConfig(),
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

export const setComponentDialogConfig = ({ state }, options = {}) => {
  if (typeof options.component !== "string" || !options.component.includes("-")) {
    throw new Error("component tag name is required for showComponentDialog");
  }

  const prevKey = state.componentDialogConfig?.key || 0;

  state.componentDialogConfig = {
    title: typeof options.title === "string" ? options.title : "",
    description: typeof options.description === "string" ? options.description : "",
    size: normalizeDialogSize(options.size, "md"),
    component: options.component,
    props: normalizeObject(options.props),
    actions: normalizeComponentDialogActions(options.actions),
    key: prevKey + 1,
  };
  state.uiType = "componentDialog";
  state.isOpen = true;
};

export const closeAll = ({ state }) => {
  state.isOpen = false;
  state.uiType = "dialog"; // Reset to default type
};

export const selectConfig = ({ state }) => state.config;
export const selectDropdownConfig = ({ state }) => state.dropdownConfig;
export const selectFormDialogConfig = ({ state }) => state.formDialogConfig;
export const selectComponentDialogConfig = ({ state }) => state.componentDialogConfig;
export const selectUiType = ({ state }) => state.uiType;
export const selectIsOpen = ({ state }) => state.isOpen;

export const selectViewData = ({ state }) => {
  const isDialogOpen = state.isOpen && state.uiType === "dialog";
  const isFormDialogOpen = state.isOpen && state.uiType === "formDialog";
  const isComponentDialogOpen = state.isOpen && state.uiType === "componentDialog";
  const componentDialogConfig = state.componentDialogConfig || createDefaultComponentDialogConfig();

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
    componentDialogConfig: {
      title: componentDialogConfig.title || "",
      description: componentDialogConfig.description || "",
      size: normalizeDialogSize(componentDialogConfig.size, "md"),
      component: componentDialogConfig.component || "",
      props: componentDialogConfig.props || {},
      actions: componentDialogConfig.actions || normalizeComponentDialogActions(),
      key: componentDialogConfig.key || 0,
    },
    isDialogOpen,
    isFormDialogOpen,
    isComponentDialogOpen,
    isDialogContainerOpen: isDialogOpen || isFormDialogOpen || isComponentDialogOpen,
    isDropdownOpen: state.isOpen && state.uiType === 'dropdown',
    dialogSize: isComponentDialogOpen
      ? normalizeDialogSize(componentDialogConfig.size, "md")
      : isFormDialogOpen
      ? normalizeDialogSize(state.formDialogConfig?.size, "md")
      : "sm",
  };
};
