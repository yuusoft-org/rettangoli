export const createInitialState = () => Object.freeze({
  openIndexPath: [],
  activeIndexByDepth: [],
});

const escapeAttrValue = (value) => `${value}`.replace(/"/g, '&quot;');
const POPOVER_ATTR_PROPS = [
  ["overlay", "overlay"],
  ["noOverlay", "no-overlay"],
  ["smPlace", "sm-place"],
  ["mdPlace", "md-place"],
  ["lgPlace", "lg-place"],
  ["xlPlace", "xl-place"],
  ["smOverlay", "sm-overlay"],
  ["mdOverlay", "md-overlay"],
  ["lgOverlay", "lg-overlay"],
  ["xlOverlay", "xl-overlay"],
  ["smNoOverlay", "sm-no-overlay"],
  ["mdNoOverlay", "md-no-overlay"],
  ["lgNoOverlay", "lg-no-overlay"],
  ["xlNoOverlay", "xl-no-overlay"],
];

const stringifyPopoverAttrs = (props = {}) => {
  return POPOVER_ATTR_PROPS
    .filter(([propName]) => props[propName] !== undefined && props[propName] !== null)
    .map(([propName, attrName]) => {
      const value = props[propName];

      if (value === true) {
        return attrName;
      }

      return `${attrName}="${escapeAttrValue(value)}"`;
    })
    .join(" ");
};

export const getItemType = (item = {}) => {
  if (item.type === "section" || item.type === "label") {
    return "section";
  }

  if (item.type === "separator") {
    return "separator";
  }

  return "item";
};

export const getItemAtIndexPath = (items, indexPath = []) => {
  let currentItems = Array.isArray(items) ? items : [];
  let currentItem;

  for (const rawIndex of indexPath) {
    const index = Number(rawIndex);
    if (!Number.isInteger(index) || index < 0 || index >= currentItems.length) {
      return undefined;
    }

    currentItem = currentItems[index];
    currentItems = Array.isArray(currentItem?.items) ? currentItem.items : [];
  }

  return currentItem;
};

export const getFirstFocusableIndex = (items = []) => {
  return items.findIndex((item) => getItemType(item) === "item");
};

// Retained for callers that need the first activatable leaf/trigger.
export const getFirstInteractiveIndex = (items = []) => {
  return items.findIndex((item) => getItemType(item) === "item" && !item.disabled);
};

const normalizeItems = ({
  items,
  depth,
  parentIndexPath,
  activeIndex,
  openIndex,
}) => {
  return items.map((item, index) => {
    const type = getItemType(item);
    const isSeparator = type === "separator";
    const isSection = type === "section";
    const isItem = type === "item";
    const isDisabled = !!item.disabled;
    const isInteractive = isItem && !isDisabled;
    const childItems = Array.isArray(item.items) ? item.items : [];
    const hasSubmenu = isItem && childItems.length > 0;
    const indexPath = [...parentIndexPath, index];
    const hasIconSlot = Object.prototype.hasOwnProperty.call(item, "icon");
    const icon = typeof item.icon === "string" && item.icon.length > 0 ? item.icon : "";
    const suffixTextValue = typeof item.shortcut === "string" && item.shortcut.length > 0
      ? item.shortcut
      : (typeof item.suffixText === "string" && item.suffixText.length > 0 ? item.suffixText : "");
    const isActive = isItem && index === activeIndex;
    const isSubmenuOpen = hasSubmenu && openIndex === index;
    const c = isDisabled ? "mu-fg" : "fg";
    const bgc = isDisabled ? "mu" : (isActive ? (isSubmenuOpen ? "mu" : "ac") : "");
    const hoverBgc = isDisabled ? "" : "ac";
    const iconColor = c;
    const suffixTextColor = "mu-fg";
    // A submenu trigger is never also a link. Nested items intentionally take
    // precedence over href/path/event-only behavior.
    const hasHref = !hasSubmenu && typeof item.href === "string" && item.href.length > 0;
    const relValue = item.rel || (item.newTab ? "noopener noreferrer" : "");
    const linkExtraAttrs = [
      item.newTab ? 'target="_blank"' : "",
      relValue ? `rel="${escapeAttrValue(relValue)}"` : "",
    ].filter(Boolean).join(" ");
    const submenuAriaAttrs = hasSubmenu
      ? [
          'aria-haspopup="menu"',
          `aria-expanded="${hasSubmenu && openIndex === index}"`,
          `aria-controls="menuPanelD${depth + 1}"`,
        ].join(" ")
      : "";

    return {
      ...item,
      index,
      depth,
      indexPath,
      indexPathString: indexPath.join("."),
      optionId: `optionD${depth}I${index}`,
      childPanelId: `menuPanelD${depth + 1}`,
      type,
      isSeparator,
      isSection,
      isItem,
      isDisabled,
      isInteractive,
      isActive,
      tabIndex: isActive ? "0" : "-1",
      hasSubmenu,
      isSubmenuOpen,
      hasIconSlot,
      icon,
      hasIcon: icon.length > 0,
      suffixText: suffixTextValue,
      hasSuffixText: suffixTextValue.length > 0,
      hasHref,
      linkExtraAttrs,
      submenuAriaAttrs,
      c,
      bgc,
      hoverBgc,
      iconColor,
      suffixTextColor,
    };
  });
};

const normalizePanelWidth = (value) => {
  if (value === undefined || value === null || value === "") {
    return "300";
  }

  return escapeAttrValue(value);
};

const createPanels = ({ items, state, props }) => {
  const panels = [];
  const openIndexPath = Array.isArray(state.openIndexPath) ? state.openIndexPath : [];
  const activeIndexByDepth = Array.isArray(state.activeIndexByDepth)
    ? state.activeIndexByDepth
    : [];
  const panelWidth = normalizePanelWidth(props.w);
  let currentItems = items;
  let parentIndexPath = [];
  let depth = 0;

  while (Array.isArray(currentItems)) {
    const requestedActiveIndex = activeIndexByDepth[depth];
    const activeIndex = (
      Number.isInteger(requestedActiveIndex)
      && getItemType(currentItems[requestedActiveIndex]) === "item"
    )
      ? requestedActiveIndex
      : getFirstFocusableIndex(currentItems);
    const openIndex = openIndexPath[depth];
    const isRoot = depth === 0;
    const parentTriggerId = !isRoot
      ? `optionD${depth - 1}I${parentIndexPath[parentIndexPath.length - 1]}`
      : "";
    const panelAttrString = isRoot
      ? 'w=f g=xs role="menu" aria-orientation="vertical"'
      : [
          'slot="floating"',
          'class="submenu-panel"',
          'pos="fix"',
          `w="${panelWidth}"`,
          'g="xs"',
          'bgc="su"',
          'bw="xs"',
          'bc="bo"',
          'br="md"',
          'shadow="md"',
          'ph="sm"',
          'pv="sm"',
          'sv="true"',
          'role="menu"',
          `aria-labelledby="${parentTriggerId}"`,
          'aria-orientation="vertical"',
          'style="max-height: calc(100vh - 16px);"',
        ].join(" ");

    panels.push({
      depth,
      isRoot,
      panelId: `menuPanelD${depth}`,
      parentIndexPath,
      parentIndexPathString: parentIndexPath.join("."),
      menuLabel: isRoot ? props.ariaLabel || "Menu" : null,
      panelAttrString,
      items: normalizeItems({
        items: currentItems,
        depth,
        parentIndexPath,
        activeIndex,
        openIndex,
      }),
    });

    if (!Number.isInteger(openIndex)) {
      break;
    }

    const triggerItem = currentItems[openIndex];
    if (
      getItemType(triggerItem) !== "item"
      || triggerItem?.disabled
      || !Array.isArray(triggerItem?.items)
      || triggerItem.items.length === 0
    ) {
      break;
    }

    parentIndexPath = [...parentIndexPath, openIndex];
    currentItems = triggerItem.items;
    depth += 1;
  }

  return panels;
};

export const resetInteraction = ({ state }) => {
  state.openIndexPath = [];
  state.activeIndexByDepth = [];
};

export const setActiveIndex = ({ state }, { depth, index }) => {
  if (!Number.isInteger(depth) || depth < 0 || !Number.isInteger(index) || index < 0) {
    return;
  }

  if (state.openIndexPath[depth] !== index) {
    state.openIndexPath = state.openIndexPath.slice(0, depth);
  }
  state.activeIndexByDepth = state.activeIndexByDepth.slice(0, depth + 1);
  state.activeIndexByDepth[depth] = index;
};

export const openSubmenu = ({ state }, { depth, index, childActiveIndex }) => {
  if (!Number.isInteger(depth) || depth < 0 || !Number.isInteger(index) || index < 0) {
    return;
  }

  state.openIndexPath = state.openIndexPath.slice(0, depth);
  state.openIndexPath[depth] = index;
  state.activeIndexByDepth = state.activeIndexByDepth.slice(0, depth + 2);
  state.activeIndexByDepth[depth] = index;

  if (Number.isInteger(childActiveIndex) && childActiveIndex >= 0) {
    state.activeIndexByDepth[depth + 1] = childActiveIndex;
  } else {
    state.activeIndexByDepth.splice(depth + 1, 1);
  }
};

export const closeSubmenusFromDepth = ({ state }, { depth }) => {
  if (!Number.isInteger(depth) || depth < 0) {
    return;
  }

  state.openIndexPath = state.openIndexPath.slice(0, depth);
  state.activeIndexByDepth = state.activeIndexByDepth.slice(0, depth + 1);
};

export const selectViewData = ({ props, state = createInitialState() }) => {
  const panels = createPanels({
    items: Array.isArray(props.items) ? props.items : [],
    state,
    props,
  });

  return {
    // Preserve the flat `items` view-data field for consumers and old tests.
    items: panels[0]?.items || [],
    panels,
    open: !!props.open,
    x: props.x || 0,
    y: props.y || 0,
    w: props.w || "300",
    h: props.h || "300",
    place: props.place || "bs",
    popoverAttrString: stringifyPopoverAttrs(props),
    menuLabel: props.ariaLabel || "Menu",
  };
};
