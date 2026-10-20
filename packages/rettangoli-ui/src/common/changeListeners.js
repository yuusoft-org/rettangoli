// Listeners called when a shared setting such as the icons or the UI messages
// changes, so mounted elements can draw again.
export const createChangeListeners = () => {
  const listeners = new Set();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify() {
      for (const listener of [...listeners]) {
        listener();
      }
    },
  };
};

// A message the app set is used only when it is a non-empty string, so a
// translation file with untranslated (empty) keys falls back to the default.
export const isUsableMessage = (value) =>
  typeof value === "string" && value.trim() !== "";
