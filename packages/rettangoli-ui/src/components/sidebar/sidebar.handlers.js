export const handleHeaderClick = (deps, payload) => {
  const { store, dispatchEvent } = deps;
  const event = payload._event;

  let path;

  const header = store.selectHeader();

  if (event.currentTarget.id === 'headerLabel') {
    path = header.labelPath;
  } else if (event.currentTarget.id === 'headerImage') {
    path = header.image.path;
  } else if (event.currentTarget.id === 'header') {
    path = header.path;
  }

  dispatchEvent(new CustomEvent('header-click', {
    detail: {
      path
    },
    bubbles: true,
    composed: true
  }));
}

export const handleItemClick = (deps, payload) => {
  const { store, dispatchEvent, render } = deps;
  const event = payload._event;
  const id = event.currentTarget.dataset.itemId || event.currentTarget.id.slice('item'.length);
  const item = store.selectItem(id);
  store.hideTooltip({});
  render();
  dispatchEvent(new CustomEvent('item-click', {
    detail: {
      item,
    },
    bubbles: true,
    composed: true
  }));
}

export const handleItemMouseEnter = (deps, payload) => {
  const { props, store, render } = deps;
  const showCompactTooltip = props.showCompactTooltip === true ||
    props.showCompactTooltip === '' ||
    props.showCompactTooltip === 'true';

  if (!showCompactTooltip || (props.mode || 'full') === 'full') {
    return;
  }

  const event = payload._event;
  const id = event.currentTarget.dataset.itemId || event.currentTarget.id.slice('item'.length);
  const item = store.selectItem(id);

  if (!item || item.type === 'groupLabel') {
    return;
  }

  const rect = event.currentTarget.getBoundingClientRect();
  const content = item.tooltip || item.title;

  if (!content) {
    return;
  }

  store.showTooltip({
    x: rect.right,
    y: rect.top + rect.height / 2,
    place: 'r',
    content,
  });
  render();
};

export const handleItemMouseLeave = (deps) => {
  const { store, render } = deps;
  store.hideTooltip({});
  render();
};
