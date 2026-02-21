const resolveEventKeyName = (event) => {
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
  deps.store.refresh();
};

export const handleTerminalKeyDown = (deps, payload) => {
  const event = payload?._event;
  const keyName = resolveEventKeyName(event);

  deps.store.setLastKey({ key: keyName });

  if (keyName === "r") {
    deps.store.refresh();
    event?.preventDefault?.();
  } else if (keyName === "up") {
    deps.store.queueUp();
    event?.preventDefault?.();
  } else if (keyName === "down") {
    deps.store.queueDown();
    event?.preventDefault?.();
  }

  deps.render();
};
