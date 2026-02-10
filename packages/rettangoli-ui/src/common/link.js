export const overlayLinkStyles = `
  :host([href]) {
    cursor: pointer;
    position: relative;
  }

  :host([href]) a {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
  }
`;

export const applyLinkAttributes = ({ linkElement, href, newTab, rel }) => {
  linkElement.href = href;

  if (newTab) {
    linkElement.target = "_blank";
  } else {
    linkElement.removeAttribute("target");
  }

  if (rel != null) {
    linkElement.rel = rel;
  } else if (newTab) {
    linkElement.rel = "noopener noreferrer";
  } else {
    linkElement.removeAttribute("rel");
  }
};

export const syncLinkOverlay = ({
  shadowRoot,
  slotElement,
  linkElement,
  href,
  newTab,
  rel,
}) => {
  if (slotElement.parentNode !== shadowRoot) {
    shadowRoot.appendChild(slotElement);
  }

  if (!href) {
    if (linkElement && linkElement.parentNode === shadowRoot) {
      shadowRoot.removeChild(linkElement);
    }
    return null;
  }

  const nextLinkElement = linkElement || document.createElement("a");
  applyLinkAttributes({
    linkElement: nextLinkElement,
    href,
    newTab,
    rel,
  });

  if (nextLinkElement.parentNode !== shadowRoot) {
    shadowRoot.appendChild(nextLinkElement);
  }

  return nextLinkElement;
};

export const syncLinkWrapper = ({
  shadowRoot,
  childElement,
  linkElement,
  href,
  newTab,
  rel,
}) => {
  if (!href) {
    if (linkElement) {
      if (childElement.parentNode === linkElement) {
        shadowRoot.appendChild(childElement);
      }
      if (linkElement.parentNode === shadowRoot) {
        shadowRoot.removeChild(linkElement);
      }
      return null;
    }

    if (childElement.parentNode !== shadowRoot) {
      shadowRoot.appendChild(childElement);
    }
    return null;
  }

  const nextLinkElement = linkElement || document.createElement("a");
  applyLinkAttributes({
    linkElement: nextLinkElement,
    href,
    newTab,
    rel,
  });

  if (childElement.parentNode !== nextLinkElement) {
    nextLinkElement.appendChild(childElement);
  }

  if (nextLinkElement.parentNode !== shadowRoot) {
    shadowRoot.appendChild(nextLinkElement);
  }

  return nextLinkElement;
};
