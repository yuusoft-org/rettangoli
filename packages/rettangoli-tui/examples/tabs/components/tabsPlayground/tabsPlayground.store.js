const PRIMARY_TABS = Object.freeze([
  { id: "system", label: "System Overview", shortLabel: "System" },
  { id: "network", label: "Network Interfaces", shortLabel: "Network" },
  { id: "bluetooth", label: "Bluetooth Devices", shortLabel: "BT" },
  { id: "services", label: "Service Management", shortLabel: "Svc" },
  { id: "hardware", label: "Hardware Routing", shortLabel: "HW" },
]);

const SECTION_TABS = Object.freeze([
  { id: "displays", label: "Displays", shortLabel: "Disp" },
  { id: "audio", label: "Audio", shortLabel: "Audio" },
]);

export const createInitialState = () => ({
  title: "Rettangoli TUI Tabs Demo",
  primaryTabs: PRIMARY_TABS,
  sectionTabs: SECTION_TABS,
  selectedPrimaryTab: PRIMARY_TABS[1].id,
  selectedSectionTab: SECTION_TABS[0].id,
  lastKey: "none",
  message: "Ready",
});

export const selectViewData = ({ state }) => ({
  ...state,
});

export const selectState = ({ state }) => state;

export const setSelectedPrimaryTab = ({ state }, payload = {}) => {
  const nextId = String(payload.id || "").trim().toLowerCase();
  const valid = PRIMARY_TABS.some((item) => item.id === nextId);
  state.selectedPrimaryTab = valid ? nextId : PRIMARY_TABS[0].id;
};

export const setSelectedSectionTab = ({ state }, payload = {}) => {
  const nextId = String(payload.id || "").trim().toLowerCase();
  const valid = SECTION_TABS.some((item) => item.id === nextId);
  state.selectedSectionTab = valid ? nextId : SECTION_TABS[0].id;
};

export const setLastKey = ({ state }, payload = {}) => {
  state.lastKey = String(payload.key || "unknown");
};

export const setMessage = ({ state }, payload = {}) => {
  state.message = String(payload.value || "");
};

export const resetDemo = ({ state }) => {
  state.selectedPrimaryTab = PRIMARY_TABS[1].id;
  state.selectedSectionTab = SECTION_TABS[0].id;
  state.lastKey = "r";
  state.message = "Reset";
};
