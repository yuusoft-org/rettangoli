const resolveKeyName = (event) => {
  if (!event) {
    return "unknown";
  }
  if (event.name) {
    return String(event.name).toLowerCase();
  }
  if (event.key && event.key.length === 1) {
    return String(event.key).toLowerCase();
  }
  return String(event.key || "unknown").toLowerCase();
};

export const handleBeforeMount = (deps) => {
  deps.store.setMessage({ value: "Press 1-5 to open a dialog example" });
};

const openInfoDialog = async (deps) => {
  const result = await deps.ui.dialog({
    form: {
      title: "Information",
      description: "Simple dialog with title and message only.",
      actions: {
        buttons: [
          { id: "ok", label: "OK", variant: "pr" },
        ],
      },
    },
    size: "sm",
    hint: "Enter or Ctrl+S to close, Esc to cancel",
  });

  deps.store.setDialogResult({ type: "1-info", result });
  deps.store.setMessage({
    value: result ? "Info dialog acknowledged" : "Info dialog canceled",
  });
};

const openConfirmDialog = async (deps) => {
  const result = await deps.ui.dialog({
    form: {
      title: "Confirm Deploy",
      description: "Do you want to continue deployment to production?",
      actions: {
        buttons: [
          { id: "cancel", label: "Cancel", variant: "gh" },
          { id: "confirm", label: "Yes, Deploy", variant: "pr" },
        ],
      },
    },
    size: "md",
    hint: "Tab focus, Enter action, Esc cancel",
  });

  deps.store.setDialogResult({ type: "2-confirm", result });
  deps.store.setMessage({
    value: result?.actionId === "confirm"
      ? "Deployment confirmed"
      : "Deployment canceled",
  });
};

const openSingleInputDialog = async (deps) => {
  const result = await deps.ui.dialog({
    form: {
      title: "Single Input",
      description: "One single-line text field.",
      fields: [
        {
          name: "taskTitle",
          type: "input-text",
          label: "Task Title",
          placeholder: "Write a short title",
          required: true,
          rules: [
            { rule: "minLength", value: 3, message: "At least 3 chars" },
          ],
        },
      ],
      actions: {
        buttons: [
          { id: "cancel", label: "Cancel", variant: "gh" },
          { id: "save", label: "Save", variant: "pr", validate: true },
        ],
      },
    },
    defaultValues: {
      taskTitle: "Ship dialog API",
    },
    size: "md",
    hint: "Type, Tab focus, Ctrl+S save",
  });

  deps.store.setDialogResult({ type: "3-single-input", result });
  deps.store.setMessage({
    value: result?.actionId === "save"
      ? "Single input saved"
      : "Single input canceled",
  });
};

const openSingleTextareaDialog = async (deps) => {
  const result = await deps.ui.dialog({
    form: {
      title: "Single Textarea",
      description: "One multiline text input.",
      fields: [
        {
          name: "notes",
          type: "input-textarea",
          label: "Notes",
          rows: 5,
          placeholder: "Write multiple lines",
          required: true,
        },
      ],
      actions: {
        buttons: [
          { id: "cancel", label: "Cancel", variant: "gh" },
          { id: "submit", label: "Submit", variant: "pr", validate: true },
        ],
      },
    },
    defaultValues: {
      notes: "Line 1",
    },
    size: "lg",
    hint: "Enter newline, Up/Down move, Ctrl+S submit",
  });

  deps.store.setDialogResult({ type: "4-single-textarea", result });
  deps.store.setMessage({
    value: result?.actionId === "submit"
      ? "Textarea submitted"
      : "Textarea canceled",
  });
};

const openMultiFieldDialog = async (deps) => {
  const result = await deps.ui.dialog({
    form: {
      title: "Multi Field Form",
      description: "Navigate across multiple fields with Tab or Up/Down.",
      fields: [
        {
          name: "name",
          type: "input-text",
          label: "Name",
          placeholder: "Your name",
          required: true,
        },
        {
          name: "summary",
          type: "input-textarea",
          label: "Summary",
          rows: 4,
          placeholder: "Multiline summary",
          required: true,
        },
        {
          name: "environment",
          type: "select",
          label: "Environment",
          options: [
            { value: "local", label: "Local" },
            { value: "staging", label: "Staging" },
            { value: "production", label: "Production" },
          ],
          required: true,
        },
      ],
      actions: {
        buttons: [
          { id: "cancel", label: "Cancel", variant: "gh" },
          { id: "save", label: "Save", variant: "pr", validate: true },
        ],
      },
    },
    defaultValues: {
      name: "Hanyon",
      summary: "Review required.\nPrepare rollback.",
      environment: "staging",
    },
    size: "lg",
    hint: "Tab/Shift+Tab focus, Up/Down edits current field only, Ctrl+S save",
  });

  deps.store.setDialogResult({ type: "5-multi-field", result });
  deps.store.setMessage({
    value: result?.actionId === "save"
      ? "Multi-field form saved"
      : "Multi-field form canceled",
  });
};

export const handleDialogPlaygroundKeyDown = (deps, payload = {}) => {
  const event = payload._event;
  const keyName = resolveKeyName(event);
  deps.store.setLastKey({ key: keyName });

  if (!deps.ui || typeof deps.ui.dialog !== "function") {
    deps.store.setMessage({ value: "Dialog service unavailable in this runtime" });
    deps.render();
    return;
  }

  if (keyName === "1") {
    event?.preventDefault?.();
    void openInfoDialog(deps).finally(() => deps.render());
    return;
  }

  if (keyName === "2") {
    event?.preventDefault?.();
    void openConfirmDialog(deps).finally(() => deps.render());
    return;
  }

  if (keyName === "3") {
    event?.preventDefault?.();
    void openSingleInputDialog(deps).finally(() => deps.render());
    return;
  }

  if (keyName === "4") {
    event?.preventDefault?.();
    void openSingleTextareaDialog(deps).finally(() => deps.render());
    return;
  }

  if (keyName === "5") {
    event?.preventDefault?.();
    void openMultiFieldDialog(deps).finally(() => deps.render());
    return;
  }

  if (keyName === "q") {
    deps.store.setMessage({ value: "Quitting..." });
  }

  deps.render();
};
