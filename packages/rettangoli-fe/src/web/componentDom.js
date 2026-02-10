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

export const initializeComponentDom = ({
  host,
  cssText,
  createStyleSheet = () => new CSSStyleSheet(),
  createElement = (tagName) => document.createElement(tagName),
}) => {
  const shadow = host.attachShadow({ mode: "open" });

  const commonStyleSheet = createStyleSheet();
  commonStyleSheet.replaceSync(COMMON_LINK_STYLE_TEXT);

  const adoptedStyleSheets = [commonStyleSheet];

  if (cssText) {
    const styleSheet = createStyleSheet();
    styleSheet.replaceSync(cssText);
    adoptedStyleSheets.push(styleSheet);
  }

  shadow.adoptedStyleSheets = adoptedStyleSheets;

  const renderTarget = createElement("div");
  renderTarget.style.cssText = "display: contents;";
  shadow.appendChild(renderTarget);
  if (!renderTarget.parentNode) {
    host.appendChild(renderTarget);
  }
  host.style.display = "contents";

  return {
    shadow,
    renderTarget,
    adoptedStyleSheets,
  };
};
