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
  deps.store.setMessage({ value: "Interactive showcase ready" });
};

const resolveSelectedEnvironmentLabel = (state) => {
  const options = Array.isArray(state?.selectorOptions) ? state.selectorOptions : [];
  const selectedEnvironment = String(state?.selectedEnvironment || "");
  const option = options.find((entry) => String(entry?.id || "") === selectedEnvironment);
  return option?.label || selectedEnvironment;
};

const openEnvironmentDialog = async (deps, size) => {
  if (!deps.ui || typeof deps.ui.dialog !== "function") {
    deps.store.setMessage({ value: "Global dialog service is unavailable" });
    deps.render();
    return;
  }

  try {
    const currentState = deps.store.selectState();
    const options = Array.isArray(currentState.selectorOptions) ? currentState.selectorOptions : [];
    const result = await deps.ui.dialog({
      form: {
        title: "Select Environment",
        description: "Choose the active environment for this session.",
        fields: [
          {
            name: "environmentId",
            type: "select",
            label: "Environment",
            options,
            required: true,
          },
        ],
        actions: {
          buttons: [
            { id: "cancel", label: "Cancel", variant: "gh" },
            { id: "confirm", label: "Select", variant: "pr" },
          ],
        },
      },
      defaultValues: {
        environmentId: currentState.selectedEnvironment,
      },
      size,
      hint: "ArrowUp/ArrowDown choose, Tab focus, Enter or Ctrl+S confirm, Esc cancel",
    });

    if (result?.actionId === "confirm") {
      const selectedOptionId = String(result.values?.environmentId || "");
      if (selectedOptionId) {
        deps.store.setSelectedEnvironment({ id: selectedOptionId });
        const nextState = deps.store.selectState();
        deps.store.setMessage({
          value: `Selected environment: ${resolveSelectedEnvironmentLabel(nextState)}`,
        });
      } else {
        deps.store.setMessage({ value: "No option selected" });
      }
    } else {
      deps.store.setMessage({ value: "Canceled environment dialog" });
    }
  } catch (error) {
    deps.store.setMessage({ value: `Dialog service error: ${error?.message || "unknown"}` });
  }

  deps.render();
};

const openTitleEditorDialog = async (deps) => {
  if (!deps.ui || typeof deps.ui.dialog !== "function") {
    deps.store.setMessage({ value: "Global dialog service is unavailable" });
    deps.render();
    return;
  }

  try {
    const currentState = deps.store.selectState();
    const result = await deps.ui.dialog({
      form: {
        title: "Edit Task Title",
        description: "Native multiline editor with form payload.",
        fields: [
          {
            name: "title",
            type: "input-textarea",
            label: "Title",
            rows: 6,
            placeholder: "Write task title",
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
        title: currentState.taskTitle,
      },
      size: "lg",
      hint: "Type to edit, Tab focus, Enter newline, Ctrl+S save, Esc cancel",
    });

    if (result?.actionId === "save") {
      deps.store.setTaskTitleFromDialog({ value: result.values?.title || "" });
      deps.store.setMessage({ value: "Saved title from dialog service" });
    } else {
      deps.store.setMessage({ value: "Canceled title edit dialog" });
    }
  } catch (error) {
    deps.store.setMessage({ value: `Dialog service error: ${error?.message || "unknown"}` });
  }

  deps.render();
};

export const handleShowcaseKeyDown = (deps, payload) => {
  const event = payload?._event;
  const keyName = resolveKeyName(event);

  deps.store.setLastKey({ key: keyName });

  if (keyName === "up") {
    deps.store.moveTaskSelectionUp();
    deps.store.setMessage({ value: "Selected previous task" });
    event?.preventDefault?.();
  } else if (keyName === "down") {
    deps.store.moveTaskSelectionDown();
    deps.store.setMessage({ value: "Selected next task" });
    event?.preventDefault?.();
  } else if (keyName === "r") {
    deps.store.resetDemo();
    deps.store.setMessage({ value: "Reset from key r" });
    event?.preventDefault?.();
  } else if (keyName === "d") {
    event?.preventDefault?.();
    void openTitleEditorDialog(deps);
    return;
  } else if (keyName === "t") {
    event?.preventDefault?.();
    void openTitleEditorDialog(deps);
    return;
  } else if (keyName === "s") {
    event?.preventDefault?.();
    void openEnvironmentDialog(deps, "f");
    return;
  } else if (keyName === "f") {
    event?.preventDefault?.();
    void openEnvironmentDialog(deps, "md");
    return;
  } else if (keyName === "e") {
    event?.preventDefault?.();

    const currentState = deps.store.selectState();
    const result = deps.openExternalEditor({
      initialValue: currentState.taskContent,
      fileName: "task-content.md",
    });

    if (result.ok) {
      deps.store.setTaskContent({ value: result.value });
      deps.store.setMessage({ value: `Content updated via ${result.editor}` });
    } else {
      deps.store.setMessage({ value: `Editor failed: ${result.error}` });
    }
  } else if (keyName === "q") {
    deps.store.setMessage({ value: "Quitting..." });
  }

  deps.render();
};
