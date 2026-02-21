import { parseAndRender as jemplParseAndRender, render as jemplRender } from "jempl";

import { flattenArrays } from './common.js';
import { parseNodeBindings } from './core/view/bindings.js';
import {
  createRefMatchers,
  resolveBestRefMatcher,
  validateElementIdForRefs,
} from './core/view/refs.js';
import {
  createConfiguredEventListener,
  getEventRateLimitState,
} from "./core/runtime/events.js";

export const parseView = ({
  h,
  template,
  viewData,
  refs,
  handlers,
  createComponentUpdateHook,
}) => {
  const result = jemplRender(template, viewData, {});

  // Flatten the array carefully to maintain structure
  const flattenedResult = flattenArrays(result);

  const childNodes = createVirtualDom({
    h,
    items: flattenedResult,
    refs,
    handlers,
    viewData,
    createComponentUpdateHook,
  });

  const vdom = h("div", { style: { display: "contents" } }, childNodes);
  return vdom;
};

/**
 *
 * @param {Object} params
 * @param {Array} params.items
 * @param {Object} params.refs
 * @param {Object} params.handlers
 * @param {Object} params.viewData
 * @returns
 */
export const createVirtualDom = ({
  h,
  items,
  refs = {},
  handlers = {},
  viewData = {},
  createComponentUpdateHook,
}) => {
  if (!Array.isArray(items)) {
    throw new Error("[Parser] Input to createVirtualDom must be an array, got " + typeof items);
  }

  const refMatchers = createRefMatchers(refs);
  const hasIdRefMatchers = refMatchers.some((refMatcher) => refMatcher.targetType === "id");

  function processItems(currentItems, parentPath = "") {
    return currentItems
      .map((item, index) => {
        // Handle text nodes
        if (typeof item === "string" || typeof item === "number") {
          return String(item);
        }

        if (typeof item !== "object" || item === null) {
          console.warn("Skipping invalid item in DOM structure:", item);
          return null;
        }

        const entries = Object.entries(item);
        if (entries.length === 0) {
          // skipping empty object item
          return null;
        }

        const [keyString, value] = entries[0];

        // Skip numeric keys that might come from array indices
        if (!isNaN(Number(keyString))) {
          if (Array.isArray(value)) {
            return processItems(value, `${parentPath}.${keyString}`);
          } else if (typeof value === "object" && value !== null) {
            const nestedEntries = Object.entries(value);
            if (nestedEntries.length > 0) {
              return processItems([value], `${parentPath}.${keyString}`);
            }
          }
          return String(value);
        }

        if (entries.length > 1) {
          console.warn(
            "Item has multiple keys, processing only the first:",
            keyString,
          );
        }

        // Parse keyString into selector and attributes
        let selector;
        let attrsString;
        const firstSpaceIndex = keyString.indexOf(" ");

        if (firstSpaceIndex === -1) {
          selector = keyString;
          attrsString = "";
        } else {
          selector = keyString.substring(0, firstSpaceIndex);
          attrsString = keyString.substring(firstSpaceIndex + 1).trim();
        }

        // Handle component tags (tags with hyphens)
        const tagName = selector.split(/[.#]/)[0];
        const isWebComponent = tagName.includes("-");

        // 1. Parse selector bindings into attrs/props.
        let attrs;
        let props;
        try {
          ({ attrs, props } = parseNodeBindings({
            attrsString,
            viewData,
            tagName,
            isWebComponent,
          }));
        } catch (error) {
          throw new Error(
            `[Parser] Failed to parse bindings for selector '${selector}' with attrs '${attrsString}': ${error.message}`,
          );
        }

        // 2. Handle ID from selector string (e.g., tag#id)
        // If an 'id' was already parsed from attrsString (e.g. id=value), it takes precedence.
        // Otherwise, use the id from the selector string.
        const idMatchInSelector = selector.match(/#([^.#\s]+)/);
        if (
          idMatchInSelector &&
          !Object.prototype.hasOwnProperty.call(attrs, "id")
        ) {
          attrs.id = idMatchInSelector[1];
        }

        // 3. Determine elementIdForRefs (this ID will be used for matching refs keys)
        // Only explicit IDs participate in id-based ref matching.
        let elementIdForRefs = null;
        if (attrs.id) {
          // Check the definitive id from attrs object.
          elementIdForRefs = attrs.id;
        }

        const selectorClassMatches = selector.match(/\.([^.#]+)/g) || [];
        const selectorClassNames = selectorClassMatches.map((classMatch) => classMatch.substring(1));
        const attributeClassNames = typeof attrs.class === "string"
          ? attrs.class.split(/\s+/).filter(Boolean)
          : [];
        const classNamesForRefs = [...new Set([...selectorClassNames, ...attributeClassNames])];

        // Extract classes and ID from selector (if not a component tag)
        const classObj = Object.create(null); // Using Object.create(null) to avoid prototype issues
        let elementId = null;

        if (!isWebComponent) {
          selectorClassNames.forEach((className) => {
            classObj[className] = true;
          });

          const idMatch = selector.match(/#([^.#\s]+)/);
          if (idMatch) {
            elementId = idMatch[1];
          }
        }

        // Determine children or text content
        let childrenOrText;
        if (typeof value === "string" || typeof value === "number") {
          childrenOrText = String(value);
        } else if (Array.isArray(value)) {
          childrenOrText = processItems(value, `${parentPath}.${keyString}`);
        } else {
          childrenOrText = [];
        }

        // Add id to attributes if it exists and it's not a component tag
        if (elementId && !isWebComponent) {
          attrs.id = elementId;
        }

        // Apply event listeners
        const eventHandlers = Object.create(null);

        if (refMatchers.length > 0) {
          if (hasIdRefMatchers && elementIdForRefs) {
            validateElementIdForRefs(elementIdForRefs);
          }
          const bestMatchRef = resolveBestRefMatcher({
            elementIdForRefs,
            classNames: classNamesForRefs,
            refMatchers,
          });

          if (bestMatchRef) {
            const bestMatchRefKey = bestMatchRef.refKey;
            const matchIdentity = bestMatchRef.matchedValue || elementIdForRefs || bestMatchRefKey;

            if (bestMatchRef.refConfig && bestMatchRef.refConfig.eventListeners) {
              const eventListeners = bestMatchRef.refConfig.eventListeners;
              const eventRateLimitState = getEventRateLimitState(handlers);
              Object.entries(eventListeners).forEach(
                ([eventType, eventConfig]) => {
                  const stateKey = `${bestMatchRefKey}:${matchIdentity}:${eventType}`;
                  const listener = createConfiguredEventListener({
                    eventType,
                    eventConfig,
                    refKey: bestMatchRefKey,
                    handlers,
                    eventRateLimitState,
                    stateKey,
                    parseAndRenderFn: jemplParseAndRender,
                    onMissingHandler: (missingHandlerName) => {
                      console.warn(
                        `[Parser] Handler '${missingHandlerName}' for refKey '${bestMatchRefKey}' (matching '${matchIdentity}') is referenced but not found in available handlers.`,
                      );
                    },
                  });
                  if (!listener) {
                    return;
                  }
                  eventHandlers[eventType] = listener;
                },
              );
            }
          }
        }

        // Create proper Snabbdom data object
        const snabbdomData = {};

        // Add key for better virtual DOM diffing
        if (elementIdForRefs) {
          snabbdomData.key = elementIdForRefs;
        } else if (selector) {
          // Generate a key based on selector, parent path, and index for list items
          const itemPath = parentPath
            ? `${parentPath}.${index}`
            : String(index);
          snabbdomData.key = `${selector}-${itemPath}`;

          // Include prop keys in key for better change detection
          const propKeys = Object.keys(props);
          if (propKeys.length > 0) {
            snabbdomData.key += `-p:${propKeys.join(",")}`;
          }
        }

        if (Object.keys(attrs).length > 0) {
          // This `attrs` object now correctly contains the intended 'id'
          snabbdomData.attrs = attrs;
        }
        if (Object.keys(classObj).length > 0) {
          // Ensure classObj is defined earlier
          snabbdomData.class = classObj;
        }
        if (Object.keys(eventHandlers).length > 0) {
          snabbdomData.on = eventHandlers;
        }
        if (Object.keys(props).length > 0) {
          snabbdomData.props = props;
        }

        // Hook behavior is injected so parser core stays environment-agnostic.
        if (isWebComponent && typeof createComponentUpdateHook === "function") {
          const componentHook = createComponentUpdateHook({
            selector,
            tagName,
          });
          if (componentHook) {
            snabbdomData.hook = componentHook;
          }
        }

        try {
          return h(tagName, snabbdomData, childrenOrText);
        } catch (error) {
          throw new Error(
            `[Parser] Error creating virtual node for '${tagName}': ${error.message}`,
          );
        }
      })
      .filter(Boolean);
  }

  return processItems(items);
};
