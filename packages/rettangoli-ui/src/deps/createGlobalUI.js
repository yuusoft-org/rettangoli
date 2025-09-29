const createGlobalUI = (globalUIElement) => {
  let listeners = {};

  return {
    once: (event, callback) => {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      const onceCallback = (...args) => {
        callback(...args);
        listeners[event] = listeners[event].filter(cb => cb !== onceCallback);
      }
      listeners[event].push(onceCallback);
    },
    emit: (event, ...args) => {
      if (listeners[event]) {
        listeners[event].forEach(callback => {
          callback(...args);
        });
      }
    },
    showAlert: async (options) => {
      if(!globalUIElement)
      {
        throw new Error("globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUIManager.");
      }
      globalUIElement.transformedHandlers.showAlert(options);
    },
    showConfirm: async (options) => {
      if(!globalUIElement)
      {
        throw new Error("globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUIManager.");
      }
      return globalUIElement.transformedHandlers.showConfirm(options);
    }
  };
}

export default createGlobalUI;