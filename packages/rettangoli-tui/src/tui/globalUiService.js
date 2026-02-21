import renderSelectorDialog from "../primitives/selectorDialog.js";

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const normalizeOptions = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null || value === "") {
    return [];
  }
  return [value];
};

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

const OVERLAY_SAVE_CURSOR = "\u001b[s";
const OVERLAY_RESTORE_CURSOR = "\u001b[u";

const isOverlayPayload = (value) => {
  return Boolean(
    value
    && typeof value === "object"
    && value.__rtglOverlay === true
    && Array.isArray(value.lines),
  );
};

const resolveOverlayPosition = (value, fallback) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.max(1, Math.floor(numericValue));
};

const createOverlayCommands = (overlay) => {
  if (!isOverlayPayload(overlay)) {
    return "";
  }

  const col = resolveOverlayPosition(overlay.x, 1);
  const row = resolveOverlayPosition(overlay.y, 1);
  const drawCommands = overlay.lines
    .map((line, index) => {
      return `\u001b[${row + index};${col}H${String(line ?? "")}`;
    })
    .join("");

  return `${OVERLAY_SAVE_CURSOR}${drawCommands}${OVERLAY_RESTORE_CURSOR}`;
};

const createRequestState = (request) => {
  const options = normalizeOptions(request.options);
  const selectedIndex = clamp(
    Number(request.selectedIndex) || 0,
    0,
    Math.max(0, options.length - 1),
  );

  return {
    ...request,
    options,
    selectedIndex,
  };
};

export const createGlobalTuiService = ({ requestRender = () => {} } = {}) => {
  const queue = [];
  let activeRequest = null;

  const openNext = () => {
    if (activeRequest || queue.length === 0) {
      return;
    }

    activeRequest = createRequestState(queue.shift());
    requestRender();
  };

  const resolveActive = (result) => {
    if (!activeRequest) {
      return;
    }

    const current = activeRequest;
    activeRequest = null;
    current.resolve(result);
    openNext();
    requestRender();
  };

  const api = {
    select: (options = {}) => {
      return new Promise((resolve) => {
        queue.push({
          title: String(options.title || "Select Option"),
          options: options.options,
          mode: options.mode || "fullscreen",
          selectedIndex: options.selectedIndex,
          hint: options.hint,
          w: options.w,
          h: options.h,
          x: options.x,
          y: options.y,
          resolve,
        });
        openNext();
      });
    },
    closeAll: () => {
      if (activeRequest) {
        resolveActive(null);
      }
      while (queue.length > 0) {
        const queuedRequest = queue.shift();
        queuedRequest.resolve(null);
      }
      requestRender();
    },
    isOpen: () => Boolean(activeRequest),
  };

  const handleKeyEvent = (keyEvent) => {
    if (!activeRequest) {
      return false;
    }

    const keyName = resolveKeyName(keyEvent);
    if (keyEvent?.ctrlKey && keyName === "c") {
      return false;
    }

    keyEvent?.preventDefault?.();

    if (keyName === "up") {
      activeRequest.selectedIndex = clamp(
        activeRequest.selectedIndex - 1,
        0,
        Math.max(0, activeRequest.options.length - 1),
      );
      requestRender();
      return true;
    }

    if (keyName === "down") {
      activeRequest.selectedIndex = clamp(
        activeRequest.selectedIndex + 1,
        0,
        Math.max(0, activeRequest.options.length - 1),
      );
      requestRender();
      return true;
    }

    if (keyName === "enter") {
      const index = clamp(
        activeRequest.selectedIndex,
        0,
        Math.max(0, activeRequest.options.length - 1),
      );
      const option = activeRequest.options[index];
      resolveActive(option === undefined ? null : { index, option });
      return true;
    }

    if (keyName === "escape" || keyName === "q") {
      resolveActive(null);
      return true;
    }

    return true;
  };

  const renderOverlayCommands = () => {
    if (!activeRequest) {
      return "";
    }

    const overlay = renderSelectorDialog({
      attrs: {},
      props: {
        open: true,
        title: activeRequest.title,
        mode: activeRequest.mode,
        options: activeRequest.options,
        selectedIndex: activeRequest.selectedIndex,
        hint: activeRequest.hint,
        w: activeRequest.w,
        h: activeRequest.h,
        x: activeRequest.x,
        y: activeRequest.y,
      },
      renderChildren: () => [],
    });

    return createOverlayCommands(overlay);
  };

  return {
    api,
    isActive: () => Boolean(activeRequest),
    handleKeyEvent,
    renderOverlayCommands,
  };
};

export default createGlobalTuiService;
