import { RENDER_TARGET_ATTRIBUTE } from "../core/protocol.js";
import { getNativeHostStyle } from "../core/runtime/props.js";
import { COMMON_COMPONENT_STYLE_TEXT } from "../core/style/commonComponentStyles.js";

const RENDER_TARGET_FLAG = "__rtglRenderTarget";

const hasRenderTargetAttr = (node) => {
  if (!node || typeof node !== "object") {
    return false;
  }

  if (typeof node.getAttribute === "function") {
    return node.getAttribute(RENDER_TARGET_ATTRIBUTE) !== null;
  }

  return node[RENDER_TARGET_FLAG] === true;
};

const markRenderTarget = (node) => {
  if (!node || typeof node !== "object") {
    return;
  }

  if (typeof node.setAttribute === "function") {
    node.setAttribute(RENDER_TARGET_ATTRIBUTE, "");
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
 * root carries prerendered styles.
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
    const marked = shadow.querySelector(`[${RENDER_TARGET_ATTRIBUTE}]`);
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

// One sheet per CSS text, shared by every shadow root that adopts it: the
// common sheet and one per component style, so connecting parses no CSS.
// Sheets are created on first use, so importing this module in Node is safe.
//
// Only native sheets are shared. A native sheet does not keep the roots that
// adopted it alive, but a polyfilled one does: construct-style-sheets-polyfill
// (which apps load for WebKit before 16.4) records every adopting root in the
// sheet, so a cached sheet would keep every component instance that ever
// connected alive. Without a native CSSStyleSheet (the polyfill, test stubs)
// each call creates fresh sheets, as before the cache. The check runs on every
// call, because the polyfill may replace CSSStyleSheet after a first connect.
// A constructed sheet resolves relative url() against the page URL when it was
// created, so a shared sheet keeps the URL of the first connect. Apps must not
// write to a sheet they read from a component root: on native browsers every
// instance shares it.
const sharedStyleSheets = new Map();

const createStyleSheetWithText = (createStyleSheet, cssText) => {
  const styleSheet = createStyleSheet();
  styleSheet.replaceSync(cssText);
  return styleSheet;
};

const createDefaultStyleSheet = () => new CSSStyleSheet();

const getStyleSheet = (cssText, createStyleSheet) => {
  // An injected factory gets fresh sheets, as before there was a cache.
  if (createStyleSheet) {
    return createStyleSheetWithText(createStyleSheet, cssText);
  }
  const isNativeStyleSheet = Function.prototype.toString
    .call(CSSStyleSheet)
    .includes("[native code]");
  if (!isNativeStyleSheet) {
    return createStyleSheetWithText(createDefaultStyleSheet, cssText);
  }
  let styleSheet = sharedStyleSheets.get(cssText);
  if (!styleSheet) {
    styleSheet = createStyleSheetWithText(createDefaultStyleSheet, cssText);
    sharedStyleSheets.set(cssText, styleSheet);
  }
  return styleSheet;
};

// A hot update replaces a component's CSS text. Forget the old sheet so the
// cache does not keep one sheet per edit; roots that still adopt it keep it.
// The cache is keyed by text, not by component: another component with the
// same CSS just gets a new sheet on its next connect.
export const releaseComponentStyleSheet = (cssText) => {
  sharedStyleSheets.delete(cssText);
};

export const initializeComponentDom = ({
  host,
  cssText,
  createStyleSheet,
  createElement = (tagName) => document.createElement(tagName),
}) => {
  const existingShadow = host.shadowRoot;
  const shadow = existingShadow ?? host.attachShadow({ mode: "open" });

  const adoptedStyleSheets = [
    getStyleSheet(COMMON_COMPONENT_STYLE_TEXT, createStyleSheet),
  ];

  if (cssText) {
    adoptedStyleSheets.push(getStyleSheet(cssText, createStyleSheet));
  }

  // Always a new array: apps may append their own sheet to a root's list.
  shadow.adoptedStyleSheets = adoptedStyleSheets;

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
