/**
 * Creates a GlobalUI manager instance for controlling global UI components.
 * Provides methods for showing alerts, confirm dialogs, dropdown menus, and closing all UI components.
 *
 * @param {HTMLElement} globalUIElement - The globalUI component element
 * @returns {Object} GlobalUI manager instance
 * @returns {Function} returns.once - Register a one-time event listener
 * @returns {Function} returns.emit - Emit an event to registered listeners
 * @returns {Function} returns.showAlert - Show an alert dialog
 * @returns {Function} returns.showConfirm - Show a confirmation dialog
 * @returns {Function} returns.showDropdownMenu - Show a dropdown menu
 * @returns {Function} returns.closeAll - General-purpose function to close all currently open UI components
 */
const createGlobalUI = (globalUIElement) => {
  let listeners = {};

  return {
    /**
     * Registers a one-time event listener for the specified event.
     * The listener will be automatically removed after the first event.
     *
     * @param {string} event - The event name to listen for
     * @param {Function} callback - The callback function to execute
     * @returns {void}
     */
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

    /**
     * Emits an event to all registered listeners for the specified event type.
     *
     * @param {string} event - The event name to emit
     * @param {...any} args - Arguments to pass to the event listeners
     * @returns {void}
     */
    emit: (event, ...args) => {
      if (listeners[event]) {
        listeners[event].forEach(callback => {
          callback(...args);
        });
      }
    },

    /**
     * Shows an alert dialog with the specified options.
     * The alert displays a message with a single OK button.
     *
     * @param {Object} options - Alert configuration options
     * @param {string} options.message - The alert message (required)
     * @param {string} [options.title] - Optional alert title
     * @param {('info'|'warning'|'error')} [options.status] - Optional status type
     * @param {string} [options.confirmText] - Text for the confirm button (default: "OK")
     * @returns {Promise<void>} Promise that resolves when the alert is closed
     * @throws {Error} If globalUIElement is not initialized
     */
    showAlert: async (options) => {
      if(!globalUIElement)
      {
        throw new Error("globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUIManager.");
      }
      globalUIElement.transformedHandlers.handleShowAlert(options);
    },

    /**
     * Shows a confirmation dialog with the specified options.
     * The dialog displays a message with confirm and cancel buttons.
     *
     * @param {Object} options - Confirmation dialog configuration options
     * @param {string} options.message - The confirmation message (required)
     * @param {string} [options.title] - Optional dialog title
     * @param {('info'|'warning'|'error')} [options.status] - Optional status type
     * @param {string} [options.confirmText] - Text for the confirm button (default: "Yes")
     * @param {string} [options.cancelText] - Text for the cancel button (default: "Cancel")
     * @returns {Promise<boolean>} Promise that resolves to true if confirmed, false if cancelled
     * @throws {Error} If globalUIElement is not initialized
     */
    showConfirm: async (options) => {
      if(!globalUIElement)
      {
        throw new Error("globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUIManager.");
      }
      return globalUIElement.transformedHandlers.handleShowConfirm(options);
    },

    /**
     * Shows a dropdown menu at the specified position with the given items.
     * The dropdown can contain various item types including labels, items, and separators.
     *
     * @param {Object} options - Dropdown menu configuration options
     * @param {Array<Object>} options.items - Array of dropdown menu items (required)
     * @param {number} options.x - X coordinate position (required)
     * @param {number} options.y - Y coordinate position (required)
     * @param {string} [options.place] - Dropdown menu place token (default: "bs")
     * @returns {Promise<Object|null>} Promise that resolves with clicked item info or null if closed without selection
     * @returns {Object} [result.index] - Index of the clicked item
     * @returns {Object} [result.item] - The clicked item object
     * @throws {Error} If globalUIElement is not initialized
     */
    showDropdownMenu: async (options) => {
      if(!globalUIElement)
      {
        throw new Error("globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUIManager.");
      }
      return globalUIElement.transformedHandlers.handleShowDropdownMenu(options);
    },

    /**
     * General-purpose function to close all currently open UI components.
     * This includes dialogs, popovers, tooltips, selects, dropdown menus, and any other floating UI elements.
     * Useful for programmatically cleaning up the entire UI surface.
     *
     * @returns {Promise<void>} Promise that resolves when all UI components are closed
     * @throws {Error} If globalUIElement is not initialized
     */
    closeAll: async () => {
      if(!globalUIElement)
      {
        throw new Error("globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUIManager.");
      }
      return globalUIElement.transformedHandlers.handleCloseAll();
    }
  };
}

export default createGlobalUI;
