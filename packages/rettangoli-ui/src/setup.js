import { createWebPatch } from '@rettangoli/fe';
import { h } from 'snabbdom/build/h';

const componentDependencies = {}

const createGlobalUIFactory = () => {
  // Create a new WeakMap for each factory instance
  const createInstanceCache = () => new WeakMap();
  
  return (container = null) => {
    const elementCache = createInstanceCache();
    
    const getOrCreateElement = (targetContainer) => {
      // Use provided container or default to document.body
      const finalContainer = targetContainer || container || document.body;
      
      // Check cache first
      if (elementCache.has(finalContainer)) {
        const cached = elementCache.get(finalContainer);
        if (cached && cached.parentNode === finalContainer) {
          return { element: cached, needsMount: false };
        }
      }
      
      // Check if element already exists in container
      let element = finalContainer.querySelector('rtgl-global-ui');
      
      if (!element) {
        element = document.createElement('rtgl-global-ui');
        return { element, needsMount: true };
      }
      
      elementCache.set(finalContainer, element);
      return { element, needsMount: false };
    };
    
    return {
      showAlert: async (options) => {
        if (!options.message) {
          throw new Error('message is required for showAlert');
        }
        
        const { element, needsMount } = getOrCreateElement();
        
        if (needsMount) {
          const finalContainer = container || document.body;
          finalContainer.appendChild(element);
          elementCache.set(finalContainer, element);
        }
        
        return element.transformedHandlers.showAlert(options);
      },
      
      showConfirm: async (options) => {
        if (!options.message) {
          throw new Error('message is required for showConfirm');
        }
        
        const { element, needsMount } = getOrCreateElement();
        
        if (needsMount) {
          const finalContainer = container || document.body;
          finalContainer.appendChild(element);
          elementCache.set(finalContainer, element);
        }
        
        return element.transformedHandlers.showConfirm(options);
      }
    };
  };
};

const globalUI = (() => {
  let instance = null;
  
  const getInstance = () => {
    if (!instance) {
      instance = createGlobalUIFactory()();
    }
    return instance;
  };
  
  return {
    showAlert: (options) => getInstance().showAlert(options),
    showConfirm: (options) => getInstance().showConfirm(options)
  };
})();

const deps = {
  components: componentDependencies,
  globalUI,
  createGlobalUI: createGlobalUIFactory
};

const patch = createWebPatch();

export {
  h,
  patch,
  deps,
  globalUI
}