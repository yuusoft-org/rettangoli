const PRIMARY_TAB_ORDER = ["system", "network", "bluetooth", "services", "hardware"];
const SECTION_TAB_ORDER = ["displays", "audio"];

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

const cycleValue = (currentValue, order, direction = 1) => {
  const currentIndex = order.indexOf(String(currentValue || "").trim().toLowerCase());
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  return order[(safeIndex + direction + order.length) % order.length];
};

export const handleTabsPlaygroundKeyDown = (deps, payload) => {
  const event = payload?._event;
  const keyName = resolveKeyName(event);
  const state = deps.store.selectState();

  deps.store.setLastKey({ key: keyName });

  if (["1", "2", "3", "4", "5"].includes(keyName)) {
    const nextId = PRIMARY_TAB_ORDER[Number(keyName) - 1];
    deps.store.setSelectedPrimaryTab({ id: nextId });
    deps.store.setMessage({ value: `Selected primary tab: ${nextId}` });
    event?.preventDefault?.();
    deps.render();
    return;
  }

  if (keyName === "tab") {
    deps.store.setSelectedPrimaryTab({
      id: cycleValue(state.selectedPrimaryTab, PRIMARY_TAB_ORDER, event?.shiftKey ? -1 : 1),
    });
    deps.store.setMessage({ value: "Cycled primary tabs" });
    event?.preventDefault?.();
    deps.render();
    return;
  }

  if (keyName === "h" || keyName === "left") {
    deps.store.setSelectedSectionTab({
      id: cycleValue(state.selectedSectionTab, SECTION_TAB_ORDER, -1),
    });
    deps.store.setMessage({ value: "Selected previous section tab" });
    event?.preventDefault?.();
    deps.render();
    return;
  }

  if (keyName === "l" || keyName === "right") {
    deps.store.setSelectedSectionTab({
      id: cycleValue(state.selectedSectionTab, SECTION_TAB_ORDER, 1),
    });
    deps.store.setMessage({ value: "Selected next section tab" });
    event?.preventDefault?.();
    deps.render();
    return;
  }

  if (keyName === "r") {
    deps.store.resetDemo();
    event?.preventDefault?.();
    deps.render();
    return;
  }

  if (keyName === "q") {
    deps.store.setMessage({ value: "Quitting..." });
    deps.render();
  }
};
