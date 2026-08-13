const resolveList = (instance) => {
  const root = instance.shadowRoot || instance.shadow;
  return root?.querySelector?.('#list') || null;
};

const resolveCurrentTop = (list) => {
  const top = Number(list?.scrollTop);
  return Number.isFinite(top) ? top : 0;
};

export function getScrollPosition() {
  return {
    top: resolveCurrentTop(resolveList(this)),
  };
}

export function setScrollPosition(payload = {}) {
  const list = resolveList(this);
  const requestedTop = Number(payload.top);

  if (!list || !Number.isFinite(requestedTop)) {
    return {
      top: resolveCurrentTop(list),
    };
  }

  const maximumTop = Math.max(
    0,
    Number(list.scrollHeight || 0) - Number(list.clientHeight || 0),
  );
  const top = Math.min(Math.max(0, requestedTop), maximumTop);

  list.scrollTop = top;

  return {
    top: resolveCurrentTop(list),
  };
}
