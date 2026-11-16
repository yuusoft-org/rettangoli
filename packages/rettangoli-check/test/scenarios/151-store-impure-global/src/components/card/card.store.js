export const createInitialState = () => ({
  id: crypto.randomUUID(),
  createdAt: Date["now"](),
  seed: Math["random"](),
  theme: localStorage.getItem("theme"),
  width: window.innerWidth,
});

export const selectViewData = ({ state }) => ({
  id: state.id,
  today: new Date().toISOString(),
  label: Date(),
  isBrowser: typeof document !== "undefined",
  online: navigator.onLine,
});

export const save = ({ state }, { value }) => {
  console.log(value);
  state.value = value;
  state.savedAt = Date.now();
  localStorage.setItem("value", value);
  fetch("/api/save");
  setTimeout(() => {
    state.saved = true;
  }, 10);
  requestAnimationFrame(() => {});
  queueMicrotask(() => {});
  state.elapsed = performance.now();
  state.width = globalThis.innerWidth + self.innerWidth;
  state.extra = someUnknownGlobal;
};
