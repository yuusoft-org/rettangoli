// The state behind a shared setting, such as the icons or the UI messages.
// The script-tag bundles include the FE components pre-bundled with their own
// copy of these modules, so the state lives under a global symbol that every
// copy reads, instead of in the module itself.
export const getSharedState = (name, createState) => {
  const key = Symbol.for(`@rettangoli/ui/${name}`);
  globalThis[key] ??= createState();
  return globalThis[key];
};

// Listeners called when a shared setting changes, so mounted elements can draw
// again. `listeners` is the shared set they are kept in.
export const createChangeListeners = (listeners = new Set()) => {
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
