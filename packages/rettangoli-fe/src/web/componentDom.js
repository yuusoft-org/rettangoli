import { getNativeHostStyle } from "../core/runtime/props.js";

const COMMON_LINK_STYLE_TEXT = `
  a, a:link, a:visited, a:hover, a:active {
    display: contents;
    color: inherit;
    text-decoration: none;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
    cursor: pointer;
  }
`;

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

const findExistingRenderTarget = (shadow) => {
  if (!shadow || typeof shadow !== "object") {
    return undefined;
  }

  if (typeof shadow.querySelector === "function") {
    return shadow.querySelector(`[${RENDER_TARGET_ATTR}]`) ?? shadow.firstElementChild;
  }

  if (Array.isArray(shadow.childNodes)) {
    return shadow.childNodes.find(hasRenderTargetAttr) ?? shadow.childNodes[0];
  }

  if (Array.isArray(shadow.children)) {
    return shadow.children.find(hasRenderTargetAttr) ?? shadow.children[0];
  }

  return shadow.firstElementChild;
};

export const initializeComponentDom = ({
  host,
  cssText,
  createStyleSheet = () => new CSSStyleSheet(),
  createElement = (tagName) => document.createElement(tagName),
}) => {
  const existingShadow = host.shadowRoot;
  const shadow = existingShadow ?? host.attachShadow({ mode: "open" });

  const commonStyleSheet = createStyleSheet();
  commonStyleSheet.replaceSync(COMMON_LINK_STYLE_TEXT);

  const adoptedStyleSheets = [commonStyleSheet];

  if (cssText) {
    const styleSheet = createStyleSheet();
    styleSheet.replaceSync(cssText);
    adoptedStyleSheets.push(styleSheet);
  }

  shadow.adoptedStyleSheets = adoptedStyleSheets;

  let renderTarget = findExistingRenderTarget(shadow);

  if (!renderTarget) {
    renderTarget = createElement("div");
    renderTarget.style.cssText = "display: contents;";
    markRenderTarget(renderTarget);
    shadow.appendChild(renderTarget);
  } else {
    renderTarget.style.cssText = "display: contents;";
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
