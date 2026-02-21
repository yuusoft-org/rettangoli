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
