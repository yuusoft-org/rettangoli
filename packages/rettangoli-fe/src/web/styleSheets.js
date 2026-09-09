// Keep stylesheet adoption behind one browser boundary. Older WebKit exposes
// CSSStyleSheet but throws "Illegal constructor" when it is constructed.
const inlineStyleText = new WeakMap();
const inlineStylesByRoot = new WeakMap();

export const createStyleSheet = (cssText) => {
  if (typeof globalThis.CSSStyleSheet?.prototype.replaceSync === "function") {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    return sheet;
  }

  const sheet = {};
  inlineStyleText.set(sheet, cssText);
  return sheet;
};

export const getStyleSheets = (shadow) =>
  inlineStylesByRoot.get(shadow)?.sheets ?? shadow.adoptedStyleSheets ?? [];

export const setStyleSheets = (shadow, sheets) => {
  const previous = inlineStylesByRoot.get(shadow);
  const useInlineStyles = sheets.some((sheet) => inlineStyleText.has(sheet));

  if (!useInlineStyles) {
    shadow.adoptedStyleSheets = sheets;
    previous?.elements.forEach((element) => element.remove());
    inlineStylesByRoot.delete(shadow);
    return;
  }

  // Prepare all replacements before changing the live root. Only remove the
  // style elements owned here; caller styles and rendered content stay intact.
  const elements = sheets.map((sheet) => {
    const element = shadow.ownerDocument.createElement("style");
    element.setAttribute("data-rtgl-stylesheet", "");
    element.textContent =
      inlineStyleText.get(sheet) ??
      [...sheet.cssRules].map((rule) => rule.cssText).join("\n");
    return element;
  });

  if ("adoptedStyleSheets" in shadow) {
    shadow.adoptedStyleSheets = [];
  }
  previous?.elements.forEach((element) => element.remove());
  shadow.append(...elements);
  inlineStylesByRoot.set(shadow, { sheets: [...sheets], elements });
};
