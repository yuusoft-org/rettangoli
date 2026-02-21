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
const TITLE_WRAP_COLUMNS = 56;

export const handleBeforeMount = (deps) => {
  deps.store.setMessage({ value: "Interactive showcase ready" });
};

const resolveSelectedEnvironmentLabel = (state) => {
  const options = Array.isArray(state?.selectorOptions) ? state.selectorOptions : [];
  const selectedEnvironment = String(state?.selectedEnvironment || "");
  const option = options.find((entry) => String(entry?.id || "") === selectedEnvironment);
  return option?.label || selectedEnvironment;
};

const resolveSelectedEnvironmentIndex = (state) => {
  const options = Array.isArray(state?.selectorOptions) ? state.selectorOptions : [];
  const selectedEnvironment = String(state?.selectedEnvironment || "");
  const index = options.findIndex((entry) => String(entry?.id || "") === selectedEnvironment);
  return index >= 0 ? index : 0;
};

const handleTitleDialogKeyDown = (deps, event, keyName) => {
  if (event?.ctrlKey && keyName === "s") {
    deps.store.saveTitleDialog();
    deps.store.setMessage({ value: "Saved title from dialog" });
    event?.preventDefault?.();
    return;
  }

  if (keyName === "escape") {
    deps.store.closeTitleDialog();
    deps.store.setMessage({ value: "Canceled title edit dialog" });
    event?.preventDefault?.();
    return;
  }

  if (keyName === "enter") {
    deps.store.insertTitleLineBreak();
    deps.store.setMessage({ value: "Inserted line break in title draft" });
    event?.preventDefault?.();
    return;
  }

  if (keyName === "backspace") {
    deps.store.backspaceTitle();
    deps.store.setMessage({ value: "Deleted title draft character" });
    event?.preventDefault?.();
    return;
  }

  if (keyName === "left") {
    deps.store.moveTitleCursorLeft();
    event?.preventDefault?.();
    return;
  }

  if (keyName === "right") {
    deps.store.moveTitleCursorRight();
    event?.preventDefault?.();
    return;
  }

  if (keyName === "up") {
    deps.store.moveTitleCursorUp();
    event?.preventDefault?.();
    return;
  }

  if (keyName === "down") {
    deps.store.moveTitleCursorDown();
    event?.preventDefault?.();
    return;
  }

  if (keyName === "tab") {
    deps.store.appendTitleChar({ char: "  ", wrapColumns: TITLE_WRAP_COLUMNS });
    deps.store.setMessage({ value: "Inserted spaces" });
    event?.preventDefault?.();
    return;
  }

  if (event?.key && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
    deps.store.appendTitleChar({ char: event.key, wrapColumns: TITLE_WRAP_COLUMNS });
    deps.store.setMessage({ value: `Typed '${event.key}' into title draft` });
    event?.preventDefault?.();
  }
};

const openEnvironmentSelector = async (deps, mode) => {
  if (!deps.ui || typeof deps.ui.select !== "function") {
    deps.store.setMessage({ value: "Global selector service is unavailable" });
    deps.render();
    return;
  }

  try {
    const currentState = deps.store.selectState();
    const options = Array.isArray(currentState.selectorOptions) ? currentState.selectorOptions : [];
    const result = await deps.ui.select({
      title: "Select Environment",
      options,
      mode,
      size: mode === "dialog" ? "md" : "lg",
      selectedIndex: resolveSelectedEnvironmentIndex(currentState),
      hint: "ArrowUp/ArrowDown move, Enter select, Esc cancel",
    });

    if (result?.option) {
      const selectedOptionId = String(
        result.option?.id
        || result.option?.value
        || result.option?.label
        || "",
      );
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
      deps.store.setMessage({ value: "Canceled environment selection" });
    }
  } catch (error) {
    deps.store.setMessage({ value: `Selector service error: ${error?.message || "unknown"}` });
  }

  deps.render();
};

export const handleShowcaseKeyDown = (deps, payload) => {
  const event = payload?._event;
  const keyName = resolveKeyName(event);

  deps.store.setLastKey({ key: keyName });

  const state = deps.store.selectState();
  if (state.titleDialogOpen) {
    handleTitleDialogKeyDown(deps, event, keyName);
    deps.render();
    return;
  }

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
    deps.store.openTitleDialog();
    deps.store.setMessage({ value: "Opened title editor dialog" });
    event?.preventDefault?.();
  } else if (keyName === "t") {
    deps.store.openTitleDialog();
    deps.store.setMessage({ value: "Opened title editor dialog" });
    event?.preventDefault?.();
  } else if (keyName === "s") {
    event?.preventDefault?.();
    void openEnvironmentSelector(deps, "fullscreen");
    return;
  } else if (keyName === "f") {
    event?.preventDefault?.();
    void openEnvironmentSelector(deps, "dialog");
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
