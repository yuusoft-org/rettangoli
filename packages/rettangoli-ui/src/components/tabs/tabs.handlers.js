export const handleClickItem = (deps, payload) => {
  const { dispatchEvent } = deps;
  const event = payload._event;
  const id = event.currentTarget.dataset.id;

  dispatchEvent(new CustomEvent('item-click', {
    detail: {
      id
    }
  }));
}

export const handleKeyDown = (deps, payload) => {
  const event = payload._event;
  if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
  if (["Enter", " "].includes(event.key)) {
    event.preventDefault();
    handleClickItem(deps, payload);
    return;
  }
  const tabs = Array.from(event.currentTarget.parentElement.querySelectorAll('[role="tab"]'));
  const index = tabs.indexOf(event.currentTarget);
  let next;
  if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
  if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = tabs.length - 1;
  if (next === undefined || !tabs[next]) return;
  event.preventDefault();
  tabs.forEach((tab, i) => { tab.tabIndex = i === next ? 0 : -1; });
  tabs[next].focus();
  tabs[next].scrollIntoView?.({ block: "nearest", inline: "nearest" });
};
