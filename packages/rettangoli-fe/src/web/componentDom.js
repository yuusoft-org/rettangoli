import { getNativeHostStyle } from "../core/runtime/props.js";
import { COMMON_COMPONENT_STYLE_TEXT } from "../core/style/commonComponentStyles.js";
import {
  createStyleSheet as createBrowserStyleSheet,
  setStyleSheets,
} from "./styleSheets.js";

const RENDER_TARGET_ATTR = "data-rtgl-render-target";
const RENDER_TARGET_FLAG = "__rtglRenderTarget";

const hasRenderTargetAttr = (node) => {
  if (!node || typeof node !== "object") {
    return false;
  }

  if (typeof node.getAttribute === "function") {
    return node.getAttribute(RENDER_TARGET_ATTR) !== null;
  }

  return node[RENDER_TARGET_FLAG] === true;
};

const markRenderTarget = (node) => {
  if (!node || typeof node !== "object") {
    return;
  }

  if (typeof node.setAttribute === "function") {
    node.setAttribute(RENDER_TARGET_ATTR, "");
  } else {
    node[RENDER_TARGET_FLAG] = true;
  }
};

/**
 * Elements that must never be adopted as the render target.
 *
 * The positional fallback below exists for shadow roots created before render
 * targets were marked. But a shadow root legitimately contains other things —
 * a `<style>`, a `<link>`, a `<slot>` — and adopting one of those is silently
 * destructive: it is given `display: contents`, then snabbdom replaces it on
 * the first patch (its `sel` cannot match the parser's `div` root), leaving
 * `instance.renderTarget` pointing at a detached node.
 *
 * Reachable today on the hot-update path, and guaranteed the moment a shadow
 * root carries server-rendered styles.
 */
const NON_ADOPTABLE_TAGS = new Set(["STYLE", "LINK", "SLOT", "TEMPLATE", "SCRIPT"]);

const isAdoptableRenderTarget = (node) => {
  if (!node || typeof node !== "object") return false;
  const tagName = typeof node.tagName === "string" ? node.tagName.toUpperCase() : "";
  return !NON_ADOPTABLE_TAGS.has(tagName);
};

const findExistingRenderTarget = (shadow) => {
  if (!shadow || typeof shadow !== "object") {
    return undefined;
  }

  if (typeof shadow.querySelector === "function") {
    const marked = shadow.querySelector(`[${RENDER_TARGET_ATTR}]`);
    if (marked) return marked;
    const first = shadow.firstElementChild;
    return isAdoptableRenderTarget(first) ? first : undefined;
  }

  if (Array.isArray(shadow.childNodes)) {
    const marked = shadow.childNodes.find(hasRenderTargetAttr);
    if (marked) return marked;
    return isAdoptableRenderTarget(shadow.childNodes[0]) ? shadow.childNodes[0] : undefined;
  }

  if (Array.isArray(shadow.children)) {
    const marked = shadow.children.find(hasRenderTargetAttr);
    if (marked) return marked;
    return isAdoptableRenderTarget(shadow.children[0]) ? shadow.children[0] : undefined;
  }

  return isAdoptableRenderTarget(shadow.firstElementChild)
    ? shadow.firstElementChild
    : undefined;
};

export const initializeComponentDom = ({
  host,
  cssText,
  createStyleSheet = createBrowserStyleSheet,
  createElement = (tagName) => document.createElement(tagName),
}) => {
  const existingShadow = host.shadowRoot;
  const shadow = existingShadow ?? host.attachShadow({ mode: "open" });

  const commonStyleSheet = createStyleSheet(COMMON_COMPONENT_STYLE_TEXT);

  const adoptedStyleSheets = [commonStyleSheet];

  if (cssText) {
    const styleSheet = createStyleSheet(cssText);
    adoptedStyleSheets.push(styleSheet);
  }

  let renderTarget = findExistingRenderTarget(shadow);

  if (!renderTarget) {
    renderTarget = createElement("div");
    renderTarget.style.cssText = "display: contents;";
    markRenderTarget(renderTarget);
    shadow.appendChild(renderTarget);
  } else {
    // Set the property rather than clobbering cssText: an adopted render
    // target may legitimately carry inline styles (including ones the server
    // emitted), and overwriting the whole declaration block discards them.
    if (renderTarget.style && renderTarget.style.display !== "contents") {
      renderTarget.style.display = "contents";
    }
    if (!hasRenderTargetAttr(renderTarget)) {
      markRenderTarget(renderTarget);
    }
  }

  if (renderTarget.parentNode !== shadow) {
    shadow.appendChild(renderTarget);
  }
  setStyleSheets(shadow, adoptedStyleSheets);
  const hostStyle = getNativeHostStyle(host);
  if (hostStyle && typeof hostStyle === "object") {
    hostStyle.display = "contents";
  }

  return {
    shadow,
    renderTarget,
    adoptedStyleSheets,
  };
};
