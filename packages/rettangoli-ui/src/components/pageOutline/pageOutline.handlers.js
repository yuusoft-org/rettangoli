

/**
 * 
 * @param {*} headingElements 
 * @param {*} offsetTop 
 * @param {*} deps 
 */
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
    store.setCurrentId(currentHeadingId);
    render();
  }
};

const startListening = (contentContainer, scrollContainer, offsetTop, deps) => {
  const { store, render } = deps;
  
  // Extract headings
  const headings = contentContainer.querySelectorAll("h1[id], h2[id], h3[id], h4[id], rtgl-text[id]");
  const headingElements = Array.from(headings);
  
  const items = headingElements.map((heading) => {
    let level = 1;
    const tagName = heading.tagName.toLowerCase();
    
    if (tagName === 'h1') level = 1;
    else if (tagName === 'h2') level = 2;
    else if (tagName === 'h3') level = 3;
    else if (tagName === 'h4') level = 4;
    else if (tagName === 'rtgl-text') {
      // For rtgl-text, check if it has a data-level attribute or default to 1
      level = parseInt(heading.getAttribute('data-level') || '1', 10);
    }
    
    return {
      id: heading.id,
      href: `#${heading.id}`,
      title: heading.textContent,
      level: level
    };
  });
  
  store.setItems(items);
  updateToLatestCurrentId(headingElements, offsetTop, deps);
  render();

  const boundCheckCurrentHeading = updateToLatestCurrentId.bind(this, headingElements, offsetTop, deps);
  
  // Add scroll listener to the scroll container
  scrollContainer.addEventListener("scroll", boundCheckCurrentHeading, {
    passive: true,
  });

  return () => {
    scrollContainer.removeEventListener("scroll", boundCheckCurrentHeading);
  }
};

export const handleBeforeMount = (deps) => {
  const { attrs } = deps;
  requestAnimationFrame(() => {
    const targetElement = document.getElementById(attrs['target-id']);
    
    // Get scroll container - default to window for page scroll if not specified
    let scrollContainer = window;
    if (attrs['scroll-container-id']) {
      scrollContainer = document.getElementById(attrs['scroll-container-id']) || window;
    }
    
    // Get offset top - default to 100px if not specified
    const offsetTop = parseInt(attrs['offset-top'] || '100', 10);
    
    const stopListening = startListening(targetElement, scrollContainer, offsetTop, deps);
    return () => {
      stopListening();
    }
  })
}
