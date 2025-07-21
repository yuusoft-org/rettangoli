

/**
 * 
 * @param {*} headingElements 
 * @param {*} deps 
 */
const updateToLatestCurrentId = (headingElements, deps) => {
  const { store, render } = deps;

  let currentHeadingId;
  let closestTopPosition = -Infinity;
  
  headingElements.forEach((heading) => {
    const rect = heading.getBoundingClientRect();
    
    if (rect.top <= 20) {
      if (rect.top > closestTopPosition) {
        closestTopPosition = rect.top;
        currentHeadingId = heading.id;
      }
    }
  });
  
  if (currentHeadingId && currentHeadingId !== store.selectCurrentId()) {
    store.setCurrentId(currentHeadingId);
    render();
  }
};

const startListening = (contentContainer, deps) => {
  const { store, render } = deps;
  
  // Extract headings
  const headings = contentContainer.querySelectorAll("rtgl-text[id]");
  const headingElements = Array.from(headings);
  
  const items = headingElements.map((heading) => ({
    id: heading.id,
    href: `#${heading.id}`,
    title: heading.textContent
  }));
  
  store.setItems(items);
  updateToLatestCurrentId(headingElements, deps);
  render();

  const boundCheckCurrentHeading = updateToLatestCurrentId.bind(this, headingElements, deps);
  
  // Add scroll listener to the content container
  contentContainer.addEventListener("scroll", boundCheckCurrentHeading, {
    passive: true,
  });

  return () => {
    contentContainer.removeEventListener("scroll", boundCheckCurrentHeading);
  }
};

export const handleBeforeMount = (deps) => {
  const { attrs } = deps;
  requestAnimationFrame(() => {
    const targetElement = document.getElementById(attrs['target-id'])
    const stopListening = startListening(targetElement, deps)
    return () => {
      stopListening();
    }
  })
}
