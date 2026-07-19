const getHeadingElements = (contentContainer) => {
  const headings = contentContainer.querySelectorAll(
    "h1[id], h2[id], h3[id], h4[id], rtgl-text[id]"
  );
  return Array.from(headings);
};

const buildItems = (headingElements) => {
  return headingElements.map((heading) => {
    let level = 1;
    const tagName = heading.tagName.toLowerCase();

    if (tagName === "h1") level = 1;
    else if (tagName === "h2") level = 2;
    else if (tagName === "h3") level = 3;
    else if (tagName === "h4") level = 4;
    else if (tagName === "rtgl-text") {
      level = parseInt(heading.getAttribute("data-level") || "1", 10);
    }

    return {
      id: heading.id,
      href: `#${heading.id}`,
      title: heading.textContent,
      level
    };
  });
};

const updateToLatestCurrentId = (headingElements, offsetTop, deps) => {
  const { store, render } = deps;

  let currentHeadingId;
  let closestTopPosition = -Infinity;
  
  headingElements.forEach((heading) => {
    const rect = heading.getBoundingClientRect();
    
    // A heading is "current" if it's at or above the offset line
    // We want the heading that's closest to the offset but still above it
    if (rect.top <= offsetTop) {
      if (rect.top > closestTopPosition) {
        closestTopPosition = rect.top;
        currentHeadingId = heading.id;
      }
    }
  });
  
  // If no heading is above the threshold, select the first visible heading below it
  if (!currentHeadingId) {
    let lowestTop = Infinity;
    headingElements.forEach((heading) => {
      const rect = heading.getBoundingClientRect();
      if (rect.top > offsetTop && rect.top < lowestTop) {
        lowestTop = rect.top;
        currentHeadingId = heading.id;
      }
    });
  }
  
  if (currentHeadingId && currentHeadingId !== store.selectCurrentId()) {
    store.setCurrentId({ id: currentHeadingId });
    render();
  }
};

const startListening = (contentContainer, scrollContainer, offsetTop, deps) => {
  const { store, render } = deps;
  let rafId = null;

  const syncOutline = () => {
    rafId = null;
    const headingElements = getHeadingElements(contentContainer);
    store.setItems({ items: buildItems(headingElements) });
    updateToLatestCurrentId(headingElements, offsetTop, deps);
    render();
  };

  const scheduleSyncOutline = () => {
    if (rafId !== null) {
      return;
    }
    rafId = requestAnimationFrame(syncOutline);
  };

  const handleScroll = () => {
    updateToLatestCurrentId(getHeadingElements(contentContainer), offsetTop, deps);
  };

  scheduleSyncOutline();

  scrollContainer.addEventListener("scroll", handleScroll, {
    passive: true,
  });

  const observer = new MutationObserver(() => {
    scheduleSyncOutline();
  });

  observer.observe(contentContainer, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["id", "data-level"]
  });

  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    observer.disconnect();
    scrollContainer.removeEventListener("scroll", handleScroll);
  }
};

export const handleBeforeMount = (deps) => {
  const { props } = deps;
  let stopListening = () => {};

  requestAnimationFrame(() => {
    const targetElement = document.getElementById(props.targetId);
    if (!targetElement) {
      return;
    }
    
    // Get scroll container - default to window for page scroll if not specified
    let scrollContainer = window;
    if (props.scrollContainerId) {
      scrollContainer = document.getElementById(props.scrollContainerId) || window;
    }
    
    // Get offset top - default to 100px if not specified
    const offsetTop = parseInt(props.offsetTop || '100', 10);
    
    stopListening = startListening(targetElement, scrollContainer, offsetTop, deps);
  })

  return () => {
    stopListening();
  };
}
