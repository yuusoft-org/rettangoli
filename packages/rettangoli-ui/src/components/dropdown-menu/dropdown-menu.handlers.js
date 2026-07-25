import {
  calculateSubmenuPosition,
  createSubmenuGracePolygon,
  isPointInPolygon,
} from "../../common/dropdownMenu.js";
import {
  getFirstFocusableIndex,
  getItemAtIndexPath,
  getItemType,
} from "./dropdown-menu.store.js";

const SUBMENU_OPEN_DELAY = 100;
const SUBMENU_CLOSE_DELAY = 300;
const TYPEAHEAD_RESET_DELAY = 1000;
const VIEWPORT_PADDING = 8;
const SUBMENU_GAP = 2;

const runtimeByStore = new WeakMap();

const createRuntime = () => ({
  openTimer: null,
  closeTimer: null,
  positionFrame: null,
  focusFrame: null,
  grace: null,
  hoverIndexPath: null,
  typeahead: new Map(),
  typeaheadTimers: new Map(),
  rootScrollElement: null,
  rootScrollListener: null,
  closeDepth: null,
  didInitialFocus: false,
});

const getRuntime = (deps) => {
  const key = deps?.store;
  if (!key || (typeof key !== "object" && typeof key !== "function")) {
    return createRuntime();
  }

  if (!runtimeByStore.has(key)) {
    runtimeByStore.set(key, createRuntime());
  }

  return runtimeByStore.get(key);
};

const cancelTimer = (runtime, name) => {
  if (runtime[name] !== null) {
    clearTimeout(runtime[name]);
    runtime[name] = null;
  }
};

const cancelFrame = (runtime, name) => {
  if (runtime[name] === null) {
    return;
  }

  if (typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(runtime[name]);
  } else {
    clearTimeout(runtime[name]);
  }
  runtime[name] = null;
};

const resetTransientRuntime = (deps, { resetInitialFocus = false } = {}) => {
  const runtime = getRuntime(deps);
  cancelTimer(runtime, "openTimer");
  cancelTimer(runtime, "closeTimer");
  cancelFrame(runtime, "positionFrame");
  cancelFrame(runtime, "focusFrame");
  runtime.typeaheadTimers.forEach(clearTimeout);
  runtime.typeaheadTimers.clear();
  runtime.typeahead.clear();
  runtime.grace = null;
  runtime.hoverIndexPath = null;
  runtime.closeDepth = null;

  if (resetInitialFocus) {
    runtime.didInitialFocus = false;
  }
};

const requestFrame = (callback) => {
  if (typeof requestAnimationFrame === "function") {
    return requestAnimationFrame(callback);
  }

  return setTimeout(callback, 0);
};

const parseIndexPath = (element) => {
  const serializedPath = element?.dataset?.indexPath;
  if (typeof serializedPath === "string" && serializedPath.length > 0) {
    const indexPath = serializedPath.split(".").map(Number);
    if (indexPath.every((index) => Number.isInteger(index) && index >= 0)) {
      return indexPath;
    }
  }

  const depth = Number(element?.dataset?.depth);
  const index = Number(element?.dataset?.index);
  if (Number.isInteger(depth) && depth === 0 && Number.isInteger(index)) {
    return [index];
  }

  return [];
};

const getPanelItems = (items, parentIndexPath = []) => {
  if (parentIndexPath.length === 0) {
    return Array.isArray(items) ? items : [];
  }

  const parentItem = getItemAtIndexPath(items, parentIndexPath);
  return Array.isArray(parentItem?.items) ? parentItem.items : [];
};

const getFocusableIndices = (items) => {
  const indices = [];

  items.forEach((item, index) => {
    if (getItemType(item) === "item") {
      indices.push(index);
    }
  });

  return indices;
};

const getDirection = (deps) => {
  if (deps?.props?.dir === "rtl") {
    return "rtl";
  }
  if (deps?.props?.dir === "ltr") {
    return "ltr";
  }

  const element = deps?.refs?.popover;
  if (element && typeof getComputedStyle === "function") {
    return getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";
  }

  return "ltr";
};

const isPointInRect = (point, rect) => {
  return !!rect
    && point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom;
};

const doRectsIntersect = (firstRect, secondRect) => {
  return !!firstRect
    && !!secondRect
    && firstRect.right > secondRect.left
    && firstRect.left < secondRect.right
    && firstRect.bottom > secondRect.top
    && firstRect.top < secondRect.bottom;
};

const setSubmenuPositioned = (panel, isPositioned) => {
  if (!panel?.dataset) {
    return;
  }

  if (isPositioned) {
    panel.dataset.positioned = "true";
    return;
  }

  delete panel.dataset.positioned;
};

const ensureRootScrollListener = (deps) => {
  const runtime = getRuntime(deps);
  const scrollElement = deps?.refs?.popover?.content;

  if (runtime.rootScrollElement === scrollElement) {
    return;
  }

  if (runtime.rootScrollElement && runtime.rootScrollListener) {
    runtime.rootScrollElement.removeEventListener("scroll", runtime.rootScrollListener);
  }

  runtime.rootScrollElement = scrollElement || null;
  runtime.rootScrollListener = null;

  if (scrollElement?.addEventListener) {
    runtime.rootScrollListener = () => scheduleSubmenuPosition(deps);
    scrollElement.addEventListener("scroll", runtime.rootScrollListener, { passive: true });
  }
};

const positionSubmenus = (deps) => {
  const { refs = {}, store } = deps;
  const openIndexPath = store?.getState?.().openIndexPath;
  if (!Array.isArray(openIndexPath) || openIndexPath.length === 0) {
    return;
  }

  const viewportWidth = globalThis.window?.innerWidth
    || globalThis.document?.documentElement?.clientWidth
    || 0;
  const viewportHeight = globalThis.window?.innerHeight
    || globalThis.document?.documentElement?.clientHeight
    || 0;
  const direction = getDirection(deps);
  let isAncestorBranchVisible = true;

  openIndexPath.forEach((parentIndex, parentDepth) => {
    const trigger = refs[`optionD${parentDepth}I${parentIndex}`];
    const panel = refs[`menuPanelD${parentDepth + 1}`];

    if (
      !trigger?.getBoundingClientRect
      || !panel?.getBoundingClientRect
      || viewportWidth <= 0
      || viewportHeight <= 0
    ) {
      setSubmenuPositioned(panel, false);
      isAncestorBranchVisible = false;
      return;
    }

    const anchorRect = trigger.getBoundingClientRect();
    const scrollport = parentDepth === 0
      ? refs.popover?.content
      : refs[`menuPanelD${parentDepth}`];
    const scrollportRect = scrollport?.getBoundingClientRect?.();

    if (
      !isAncestorBranchVisible
      || (scrollportRect && !doRectsIntersect(anchorRect, scrollportRect))
    ) {
      setSubmenuPositioned(panel, false);
      isAncestorBranchVisible = false;
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    const position = calculateSubmenuPosition({
      anchorRect,
      panelWidth: panelRect.width,
      panelHeight: panelRect.height,
      viewportWidth,
      viewportHeight,
      direction,
      gap: SUBMENU_GAP,
      padding: VIEWPORT_PADDING,
    });

    panel.style.left = `${Math.round(position.left)}px`;
    panel.style.top = `${Math.round(position.top)}px`;
    panel.dataset.side = position.side;
    setSubmenuPositioned(panel, true);
  });
};

const scheduleSubmenuPosition = (deps) => {
  const runtime = getRuntime(deps);
  cancelFrame(runtime, "positionFrame");
  runtime.positionFrame = requestFrame(() => {
    runtime.positionFrame = null;
    if (deps?.props?.open === false || deps?.refs?.popover?.isConnected === false) {
      return;
    }
    ensureRootScrollListener(deps);
    positionSubmenus(deps);
  });
};

const scheduleFocus = (deps, indexPath) => {
  const runtime = getRuntime(deps);
  cancelFrame(runtime, "focusFrame");
  runtime.focusFrame = requestFrame(() => {
    runtime.focusFrame = null;
    if (deps?.props?.open === false || deps?.refs?.popover?.isConnected === false) {
      return;
    }
    if (indexPath.length === 0) {
      deps?.refs?.menuPanelD0?.focus?.();
      return;
    }
    const depth = indexPath.length - 1;
    const index = indexPath[depth];
    deps?.refs?.[`optionD${depth}I${index}`]?.focus?.();
  });
};

const renderInteraction = (deps, { focusIndexPath } = {}) => {
  deps.render();
  // Position synchronously to avoid briefly revealing a newly opened panel at
  // its default origin, then repeat in a frame after layout settles.
  positionSubmenus(deps);
  scheduleSubmenuPosition(deps);

  if (focusIndexPath) {
    scheduleFocus(deps, focusIndexPath);
  }
};

const clearGrace = (runtime) => {
  runtime.grace = null;
  cancelTimer(runtime, "closeTimer");
  runtime.closeDepth = null;
};

const clearTypeaheadFromDepth = (runtime, depth) => {
  for (const [entryDepth, timer] of runtime.typeaheadTimers) {
    if (entryDepth >= depth) {
      clearTimeout(timer);
      runtime.typeaheadTimers.delete(entryDepth);
      runtime.typeahead.delete(entryDepth);
    }
  }
};

const closeSubmenusFromDepth = (deps, depth, { render = true } = {}) => {
  const openIndexPath = deps.store?.getState?.().openIndexPath || [];
  if (openIndexPath.length <= depth) {
    return false;
  }

  deps.store.closeSubmenusFromDepth({ depth });
  const runtime = getRuntime(deps);
  clearGrace(runtime);
  clearTypeaheadFromDepth(runtime, depth + 1);

  if (render) {
    renderInteraction(deps);
  }

  return true;
};

const scheduleSubmenuClose = (
  deps,
  runtime,
  depth,
  { clearGraceOnFire = false } = {},
) => {
  const scheduledDepth = runtime.closeDepth === null
    ? depth
    : Math.min(runtime.closeDepth, depth);

  cancelTimer(runtime, "closeTimer");
  runtime.closeDepth = scheduledDepth;
  runtime.closeTimer = setTimeout(() => {
    runtime.closeTimer = null;
    runtime.closeDepth = null;
    if (clearGraceOnFire) {
      runtime.grace = null;
    }
    if (deps.props?.open && deps.refs?.popover?.isConnected !== false) {
      closeSubmenusFromDepth(deps, scheduledDepth);
    }
  }, SUBMENU_CLOSE_DELAY);
};

const openSubmenu = (deps, indexPath, { focusChild = false } = {}) => {
  const depth = indexPath.length - 1;
  const index = indexPath[depth];
  const item = getItemAtIndexPath(deps.props?.items, indexPath);
  const childItems = Array.isArray(item?.items) ? item.items : [];

  if (
    getItemType(item) !== "item"
    || item?.disabled
    || childItems.length === 0
  ) {
    return false;
  }

  const childActiveIndex = getFirstFocusableIndex(childItems);
  deps.store.openSubmenu({ depth, index, childActiveIndex });
  const runtime = getRuntime(deps);
  clearGrace(runtime);
  clearTypeaheadFromDepth(runtime, depth + 1);
  renderInteraction(deps, {
    focusIndexPath: focusChild && childActiveIndex >= 0
      ? [...indexPath, childActiveIndex]
      : undefined,
  });
  return true;
};

const dispatchClose = (deps) => {
  resetTransientRuntime(deps, { resetInitialFocus: true });
  deps.store?.resetInteraction?.({});
  deps.dispatchEvent(new CustomEvent("close"));
};

const dispatchItemClick = (deps, event, indexPath, item) => {
  const index = indexPath[indexPath.length - 1];

  deps.dispatchEvent(new CustomEvent("item-click", {
    detail: {
      index,
      indexPath,
      item,
      id: item.id,
      path: item.path,
      href: item.href,
      trigger: event.type,
    },
  }));
};

export const handleOnUpdate = (deps, payload) => {
  const { render, refs, store } = deps;
  const { oldProps = {}, newProps = {} } = payload;
  const itemsChanged = oldProps.items !== newProps.items;
  const shouldRefreshPopover = itemsChanged && !!newProps.open;

  if (itemsChanged || (!newProps.open && oldProps.open)) {
    store?.resetInteraction?.({});
    resetTransientRuntime(deps, { resetInitialFocus: true });
  } else if (newProps.open && !oldProps.open) {
    resetTransientRuntime(deps, { resetInitialFocus: true });
  }

  render();

  if (shouldRefreshPopover) {
    refs?.popover?.refreshContent?.();
  }

  if (newProps.open) {
    scheduleSubmenuPosition(deps);
  }
};

export const handleClosePopover = (deps) => {
  dispatchClose(deps);
};

export const handlePopoverPositioned = (deps) => {
  const runtime = getRuntime(deps);
  ensureRootScrollListener(deps);
  positionSubmenus(deps);
  scheduleSubmenuPosition(deps);

  if (runtime.didInitialFocus) {
    return;
  }

  runtime.didInitialFocus = true;
  const items = Array.isArray(deps.props?.items) ? deps.props.items : [];
  const requestedIndex = deps.store?.getState?.().activeIndexByDepth?.[0];
  const initialIndex = (
    Number.isInteger(requestedIndex)
    && getItemType(items[requestedIndex]) === "item"
  )
    ? requestedIndex
    : getFirstFocusableIndex(items);

  if (initialIndex >= 0) {
    deps.store?.setActiveIndex?.({ depth: 0, index: initialIndex });
    deps.render();
    scheduleFocus(deps, [initialIndex]);
  } else {
    scheduleFocus(deps, []);
  }
};

export const handleViewportChange = (deps) => {
  scheduleSubmenuPosition(deps);
};

export const handleMenuPanelScroll = (deps) => {
  scheduleSubmenuPosition(deps);
};

export const handleMenuPanelKeyDown = (deps, payload) => {
  const event = payload._event;

  if (event.key === "Escape" || event.key === "Tab") {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
    }
    dispatchClose(deps);
  }
};

export const handleClickMenuItem = (deps, payload) => {
  const event = payload._event;
  cancelTimer(getRuntime(deps), "openTimer");
  const indexPath = parseIndexPath(event.currentTarget);
  const item = getItemAtIndexPath(deps.props?.items, indexPath);
  const itemType = getItemType(item);

  if (!item || itemType !== "item" || item.disabled) {
    event.preventDefault();
    return;
  }

  if (Array.isArray(item.items) && item.items.length > 0) {
    event.preventDefault();
    const depth = indexPath.length - 1;
    const isOpen = deps.store?.getState?.().openIndexPath?.[depth] === indexPath[depth];

    if (isOpen) {
      closeSubmenusFromDepth(deps, depth);
    } else {
      openSubmenu(deps, indexPath, {
        focusChild: event.pointerType === "touch" || event.pointerType === "pen",
      });
    }
    return;
  }

  if (!item.href) {
    event.preventDefault();
  }

  dispatchItemClick(deps, event, indexPath, item);
};

export const handleMenuItemFocus = (deps, payload) => {
  const indexPath = parseIndexPath(payload._event.currentTarget);
  const depth = indexPath.length - 1;
  const index = indexPath[depth];
  const currentActive = deps.store?.getState?.().activeIndexByDepth?.[depth];

  if (depth >= 0 && currentActive !== index) {
    deps.store.setActiveIndex({ depth, index });
    deps.render();
  }
};

export const handleMenuItemPointerEnter = (deps, payload) => {
  const event = payload._event;
  if (event.pointerType && event.pointerType !== "mouse") {
    return;
  }

  const runtime = getRuntime(deps);
  const point = { x: event.clientX, y: event.clientY };
  if (runtime.grace && isPointInPolygon(point, runtime.grace.polygon)) {
    return;
  }

  clearGrace(runtime);
  cancelTimer(runtime, "openTimer");
  const indexPath = parseIndexPath(event.currentTarget);
  const item = getItemAtIndexPath(deps.props?.items, indexPath);
  const depth = indexPath.length - 1;
  const index = indexPath[depth];

  if (!item || getItemType(item) !== "item") {
    return;
  }

  runtime.hoverIndexPath = indexPath;
  const state = deps.store.getState();
  let shouldRender = state.activeIndexByDepth?.[depth] !== index;
  deps.store.setActiveIndex({ depth, index });
  scheduleFocus(deps, indexPath);

  if (!item.disabled && Array.isArray(item.items) && item.items.length > 0) {
    if (state.openIndexPath?.[depth] === index) {
      if (shouldRender) {
        renderInteraction(deps);
      }
      return;
    }

    if (shouldRender) {
      renderInteraction(deps);
    }
    runtime.openTimer = setTimeout(() => {
      runtime.openTimer = null;
      const currentItem = getItemAtIndexPath(deps.props?.items, indexPath);
      if (
        deps.props?.open
        && deps.refs?.popover?.isConnected !== false
        && currentItem === item
        && runtime.hoverIndexPath?.join(".") === indexPath.join(".")
      ) {
        openSubmenu(deps, indexPath);
      }
    }, SUBMENU_OPEN_DELAY);
    return;
  }

  shouldRender = closeSubmenusFromDepth(deps, depth, { render: false }) || shouldRender;
  if (shouldRender) {
    renderInteraction(deps);
  }
};

export const handleMenuItemPointerLeave = (deps, payload) => {
  const event = payload._event;
  if (event.pointerType && event.pointerType !== "mouse") {
    return;
  }

  const runtime = getRuntime(deps);
  cancelTimer(runtime, "openTimer");
  const indexPath = parseIndexPath(event.currentTarget);
  const depth = indexPath.length - 1;
  const index = indexPath[depth];
  const isOpen = deps.store?.getState?.().openIndexPath?.[depth] === index;

  if (!isOpen) {
    runtime.hoverIndexPath = null;
    return;
  }

  const panel = deps.refs?.[`menuPanelD${depth + 1}`];
  const relatedTarget = event.relatedTarget;
  if (panel?.contains?.(relatedTarget)) {
    clearGrace(runtime);
    return;
  }

  if (!panel?.getBoundingClientRect) {
    return;
  }

  runtime.grace = {
    depth,
    trigger: event.currentTarget,
    panel,
    polygon: createSubmenuGracePolygon({
      exitPoint: { x: event.clientX, y: event.clientY },
      panelRect: panel.getBoundingClientRect(),
      side: panel.dataset.side || "right",
      buffer: 5,
    }),
  };
  scheduleSubmenuClose(deps, runtime, depth, { clearGraceOnFire: true });
};

export const handleMenuPanelPointerEnter = (deps, payload) => {
  const depth = Number(payload._event.currentTarget?.dataset?.depth);
  const runtime = getRuntime(deps);

  if (runtime.closeDepth !== null && depth > runtime.closeDepth) {
    cancelTimer(runtime, "closeTimer");
    runtime.closeDepth = null;
  }

  if (runtime.grace && runtime.grace.depth === depth - 1) {
    clearGrace(runtime);
  }
};

export const handleMenuPanelPointerLeave = (deps, payload) => {
  const event = payload._event;
  if (event.pointerType && event.pointerType !== "mouse") {
    return;
  }

  const depth = Number(event.currentTarget?.dataset?.depth);
  if (!Number.isInteger(depth) || depth <= 0) {
    return;
  }

  const parentIndex = deps.store?.getState?.().openIndexPath?.[depth - 1];
  const parentTrigger = deps.refs?.[`optionD${depth - 1}I${parentIndex}`];
  if (parentTrigger?.contains?.(event.relatedTarget)) {
    clearGrace(getRuntime(deps));
    return;
  }

  const runtime = getRuntime(deps);
  scheduleSubmenuClose(deps, runtime, depth - 1);
};

export const handleDocumentPointerMove = (deps, payload) => {
  const runtime = getRuntime(deps);
  if (!runtime.grace) {
    return;
  }

  const event = payload._event;
  const point = { x: event.clientX, y: event.clientY };
  if (
    isPointInPolygon(point, runtime.grace.polygon)
    || isPointInRect(point, runtime.grace.trigger?.getBoundingClientRect?.())
    || isPointInRect(point, runtime.grace.panel?.getBoundingClientRect?.())
  ) {
    return;
  }

  const depth = runtime.closeDepth === null
    ? runtime.grace.depth
    : Math.min(runtime.grace.depth, runtime.closeDepth);
  clearGrace(runtime);
  closeSubmenusFromDepth(deps, depth);
};

const moveFocus = (deps, indexPath, movement) => {
  const parentIndexPath = indexPath.slice(0, -1);
  const panelItems = getPanelItems(deps.props?.items, parentIndexPath);
  const focusableIndices = getFocusableIndices(panelItems);
  if (focusableIndices.length === 0) {
    return;
  }

  const currentIndex = indexPath[indexPath.length - 1];
  const currentPosition = focusableIndices.indexOf(currentIndex);
  let nextPosition;

  if (movement === "first") {
    nextPosition = 0;
  } else if (movement === "last") {
    nextPosition = focusableIndices.length - 1;
  } else {
    const direction = movement === "next" ? 1 : -1;
    const safePosition = currentPosition < 0 ? 0 : currentPosition;
    nextPosition = (safePosition + direction + focusableIndices.length) % focusableIndices.length;
  }

  const nextIndex = focusableIndices[nextPosition];
  const depth = indexPath.length - 1;
  deps.store.setActiveIndex({ depth, index: nextIndex });
  renderInteraction(deps, {
    focusIndexPath: [...parentIndexPath, nextIndex],
  });
};

const handleTypeahead = (deps, event, indexPath) => {
  if (
    event.key.length !== 1
    || event.altKey
    || event.ctrlKey
    || event.metaKey
  ) {
    return false;
  }

  const runtime = getRuntime(deps);
  const depth = indexPath.length - 1;
  const parentIndexPath = indexPath.slice(0, -1);
  const items = getPanelItems(deps.props?.items, parentIndexPath);
  const focusableIndices = getFocusableIndices(items);
  if (focusableIndices.length === 0) {
    return true;
  }

  const priorQuery = runtime.typeahead.get(depth) || "";
  const query = `${priorQuery}${event.key}`.toLocaleLowerCase();
  runtime.typeahead.set(depth, query);

  const priorTimer = runtime.typeaheadTimers.get(depth);
  if (priorTimer) {
    clearTimeout(priorTimer);
  }
  runtime.typeaheadTimers.set(depth, setTimeout(() => {
    runtime.typeahead.delete(depth);
    runtime.typeaheadTimers.delete(depth);
  }, TYPEAHEAD_RESET_DELAY));

  const currentIndex = indexPath[depth];
  const currentPosition = focusableIndices.indexOf(currentIndex);
  const orderedIndices = [
    ...focusableIndices.slice(currentPosition + 1),
    ...focusableIndices.slice(0, currentPosition + 1),
  ];
  let match = orderedIndices.find((index) => {
    return `${items[index]?.label || ""}`.trim().toLocaleLowerCase().startsWith(query);
  });

  // Repeated presses of the same character cycle through matching items.
  if (match === undefined && new Set(query).size === 1) {
    match = orderedIndices.find((index) => {
      return `${items[index]?.label || ""}`.trim().toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase());
    });
  }

  if (match !== undefined) {
    deps.store.setActiveIndex({ depth, index: match });
    renderInteraction(deps, {
      focusIndexPath: [...parentIndexPath, match],
    });
  }

  return true;
};

export const handleMenuItemKeyDown = (deps, payload) => {
  const event = payload._event;
  const indexPath = parseIndexPath(event.currentTarget);
  const depth = indexPath.length - 1;
  const item = getItemAtIndexPath(deps.props?.items, indexPath);
  const direction = getDirection(deps);
  const openKey = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
  const closeKey = direction === "rtl" ? "ArrowRight" : "ArrowLeft";

  if (!item || getItemType(item) !== "item") {
    return;
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    moveFocus(deps, indexPath, event.key === "ArrowDown" ? "next" : "previous");
    return;
  }

  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    moveFocus(deps, indexPath, event.key === "Home" ? "first" : "last");
    return;
  }

  if (
    event.key === openKey
    && !item.disabled
    && Array.isArray(item.items)
    && item.items.length > 0
  ) {
    event.preventDefault();
    openSubmenu(deps, indexPath, { focusChild: true });
    return;
  }

  if (event.key === closeKey && depth > 0) {
    event.preventDefault();
    const parentIndexPath = indexPath.slice(0, -1);
    closeSubmenusFromDepth(deps, depth - 1, { render: false });
    renderInteraction(deps, { focusIndexPath: parentIndexPath });
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();

    if (item.disabled) {
      return;
    }

    if (Array.isArray(item.items) && item.items.length > 0) {
      openSubmenu(deps, indexPath, { focusChild: true });
    } else if (typeof event.currentTarget?.click === "function") {
      event.currentTarget.click();
    } else {
      dispatchItemClick(deps, event, indexPath, item);
    }
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    const openIndexPath = deps.store?.getState?.().openIndexPath || [];

    if (openIndexPath.length > 0) {
      const parentDepth = openIndexPath.length - 1;
      const parentTriggerPath = openIndexPath.slice();
      closeSubmenusFromDepth(deps, parentDepth, { render: false });
      renderInteraction(deps, { focusIndexPath: parentTriggerPath });
    } else {
      dispatchClose(deps);
    }
    return;
  }

  if (event.key === "Tab") {
    dispatchClose(deps);
    return;
  }

  if (handleTypeahead(deps, event, indexPath)) {
    event.preventDefault();
  }
};
