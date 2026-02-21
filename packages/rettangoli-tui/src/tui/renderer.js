import { createDefaultTuiPrimitives } from "../primitives/index.js";

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

const createOverlayCommands = (overlays = []) => {
  return overlays
    .map((overlay) => {
      const col = resolveOverlayPosition(overlay.x, 1);
      const row = resolveOverlayPosition(overlay.y, 1);
      const drawCommands = overlay.lines
        .map((line, index) => {
          return `\u001b[${row + index};${col}H${String(line ?? "")}`;
        })
        .join("");

      return `${OVERLAY_SAVE_CURSOR}${drawCommands}${OVERLAY_RESTORE_CURSOR}`;
    })
    .join("");
};

const normalizeOutput = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeOutput(entry))
      .filter((entry) => entry.length > 0)
      .join("\n");
  }

  return String(value);
};

const renderNode = ({ node, context }) => {
  const { components, overlays } = context;

  if (node === undefined || node === null) {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node
      .map((entry) => renderNode({ node: entry, context }))
      .filter((entry) => entry.length > 0)
      .join("\n");
  }

  const tag = node.sel || "div";
  const attrs = node.data?.attrs || {};
  const props = node.data?.props || {};
  const text = node.text !== undefined && node.text !== null
    ? String(node.text)
    : "";
  const children = Array.isArray(node.children) ? node.children : [];

  const renderChild = (child) => {
    return renderNode({ node: child, context });
  };

  const renderChildren = () => {
    return children
      .map((child) => renderChild(child))
      .filter((value) => value.length > 0);
  };

  const joinChildren = (delimiter = "\n") => {
    return renderChildren().join(delimiter);
  };

  const customRenderer = components[tag];
  if (typeof customRenderer === "function") {
    const customOutput = customRenderer({
      tag,
      attrs,
      props,
      text,
      node,
      children,
      renderNode: renderChild,
      renderChildren,
      joinChildren,
      registerOverlay: (overlayPayload) => {
        if (isOverlayPayload(overlayPayload)) {
          overlays.push(overlayPayload);
        }
      },
    });

    if (isOverlayPayload(customOutput)) {
      overlays.push(customOutput);
      return "";
    }

    return normalizeOutput(customOutput);
  }

  if (text.length > 0) {
    return text;
  }

  const flow = attrs.d || props.d;
  const joiner = flow === "h" ? " " : "\n";
  return joinChildren(joiner);
};

export const createTuiRendererContext = ({ components = {} } = {}) => {
  return {
    overlays: [],
    components: {
      ...createDefaultTuiPrimitives(),
      ...components,
    },
  };
};

export const renderVNodeToString = ({ vNode, components = {} }) => {
  const context = createTuiRendererContext({ components });
  const output = renderNode({ node: vNode, context });
  const baseOutput = output
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
  const overlayCommands = createOverlayCommands(context.overlays);
  return `${baseOutput}${overlayCommands}`;
};
