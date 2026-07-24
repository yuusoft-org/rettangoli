/**
 * @typedef {Object} GlobalUIDropdownItem
 * @property {string} [label] - Visible item or section label
 * @property {('section'|'item'|'separator'|'label')} [type] - Row type; defaults to `item`
 * @property {string} [id] - Optional item identity
 * @property {string} [href] - Native link destination
 * @property {string} [path] - Application/router destination
 * @property {boolean} [disabled] - Whether the item is disabled
 * @property {GlobalUIDropdownItem[]} [items] - Nested submenu items. A non-empty array takes
 * precedence over the item's navigation or leaf action.
 */

/**
 * @typedef {Object} GlobalUIDropdownResult
 * @property {number} index - Selected leaf's index in its immediate menu
 * @property {number[]} indexPath - Root-to-leaf indexes locating the selected item
 * @property {GlobalUIDropdownItem} item - Selected leaf item
 */

/**
 * Creates a GlobalUI manager instance for controlling global UI components.
 * Provides methods for showing alerts, confirm dialogs, form dialogs,
 * dropdown menus, toasts, and closing all UI components.
 *
 * @param {HTMLElement} globalUIElement - The globalUI component element
 * @returns {Object} GlobalUI manager instance
 * @returns {Function} returns.once - Register a one-time event listener
 * @returns {Function} returns.emit - Emit an event to registered listeners
 * @returns {Function} returns.showAlert - Show an alert dialog
 * @returns {Function} returns.showConfirm - Show a confirmation dialog
 * @returns {Function} returns.showFormDialog - Show a form dialog
 * @returns {Function} returns.showComponentDialog - Show a component dialog
 * @returns {Function} returns.showDropdownMenu - Show a dropdown menu
 * @returns {Function} returns.showToast - Show a temporary toast message
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
     * @returns {Function} Unsubscribe function
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
      return () => {
        listeners[event] = (listeners[event] ?? []).filter(cb => cb !== onceCallback);
      };
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
        [...listeners[event]].forEach(callback => {
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
      return globalUIElement.transformedHandlers.handleShowAlert(options);
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
     * Shows a dialog containing an embedded rtgl-form.
     *
     * @param {Object} options - Form dialog configuration options
     * @param {Object} options.form - rtgl-form schema (required)
     * @param {Object} [options.defaultValues] - Initial form values
     * @param {Object} [options.context] - Context used by rtgl-form conditional rendering
     * @param {boolean} [options.disabled] - Whether the form should be disabled
     * @param {('sm'|'md'|'lg'|'f')} [options.size] - Dialog size token (default: "md")
     * @param {Function} [options.onFieldEvent] - Called with `{ detail, formEl }` for form field events
     * @param {Function} [options.mount] - Called once after the form mounts, useful for slot content
     * @returns {Promise<Object|null>} Resolves with form-action detail or null on dismiss
     * @throws {Error} If globalUIElement is not initialized
     */
    showFormDialog: async (options) => {
      if(!globalUIElement)
      {
        throw new Error("globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUIManager.");
      }
      return globalUIElement.transformedHandlers.handleShowFormDialog(options);
    },

    /**
     * Shows a dialog containing a custom component body.
     *
     * @param {Object} options - Component dialog configuration options
     * @param {string} options.component - Custom element tag name (required)
     * @param {Object} [options.props] - Initial props assigned onto the body component
     * @param {string} [options.title] - Optional dialog title
     * @param {string} [options.description] - Optional dialog description
     * @param {('sm'|'md'|'lg'|'f')} [options.size] - Dialog size token (default: "md")
     * @param {Object} [options.actions] - Footer action configuration
     * @returns {Promise<Object|null>} Resolves with `{ actionId, values? }` or null on dismiss
     * @throws {Error} If globalUIElement is not initialized
     */
    showComponentDialog: async (options) => {
      if(!globalUIElement)
      {
        throw new Error("globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUIManager.");
      }
      return globalUIElement.transformedHandlers.handleShowComponentDialog(options);
    },

    /**
     * Shows a dropdown menu at the specified position with the given items.
     * The dropdown can contain sections, items, separators, and recursively nested submenus.
     *
     * @param {Object} options - Dropdown menu configuration options
     * @param {GlobalUIDropdownItem[]} options.items - Recursive array of dropdown menu items (required)
     * @param {number} options.x - X coordinate position (required)
     * @param {number} options.y - Y coordinate position (required)
     * @param {string} [options.place] - Dropdown menu place token (default: "bs")
     * @param {('ltr'|'rtl')} [options.dir] - Optional explicit menu direction
     * @param {string} [options.ariaLabel] - Accessible name for the root menu and dialog
     * @param {string} [options.mdPlace] - Responsive place token, for example "center" on mobile
     * @param {boolean} [options.overlay] - Whether to show a dialog-style dim overlay
     * @param {boolean} [options.mdOverlay] - Responsive overlay flag for mobile breakpoints
     * @returns {Promise<GlobalUIDropdownResult|null>} Promise that resolves with the selected
     * leaf's index, root-to-leaf index path, and item, or null if closed without selection
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
     * Shows a toast message that auto-dismisses after 3 seconds.
     *
     * @param {Object} options - Toast configuration options
     * @param {string} options.message - The toast message (required)
     * @param {('sm'|'md'|'lg')} [options.size] - Toast width preset matching dialog sizing (default: "sm")
     * @param {('top'|'bottom')} [options.position] - Vertical viewport placement (default: "top")
     * @returns {void}
     * @throws {Error} If globalUIElement is not initialized
     */
    showToast: (options) => {
      if(!globalUIElement)
      {
        throw new Error("globalUIElement is not set. Make sure to initialize the global UI component and pass it to createGlobalUIManager.");
      }
      globalUIElement.transformedHandlers.handleShowToast(options);
    },

    /**
     * General-purpose function to close all currently open UI components.
     * This includes dialogs, dropdown menus, toasts, and any other floating UI elements
     * managed by rtgl-global-ui.
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
