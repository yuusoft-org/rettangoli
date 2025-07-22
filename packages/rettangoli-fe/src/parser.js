import { render as jemplRender } from 'jempl';

import { flattenArrays } from './common.js';

const lodashGet = (obj, path) => {
  if (!path) return obj;

  // Parse path to handle both dot notation and bracket notation
  const parts = [];
  let current = '';
  let inBrackets = false;
  let quoteChar = null;

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

    if (!inBrackets && char === '.') {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else if (!inBrackets && char === '[') {
      if (current) {
        parts.push(current);
        current = '';
      }
      inBrackets = true;
    } else if (inBrackets && char === ']') {
      if (current) {
        // Remove quotes if present and add the key
        if ((current.startsWith('"') && current.endsWith('"')) ||
          (current.startsWith("'") && current.endsWith("'"))) {
          parts.push(current.slice(1, -1));
        } else {
          // Numeric index or unquoted string
          const numValue = Number(current);
          parts.push(isNaN(numValue) ? current : numValue);
        }
        current = '';
      }
      inBrackets = false;
      quoteChar = null;
    } else if (inBrackets && (char === '"' || char === "'")) {
      if (!quoteChar) {
        quoteChar = char;
      } else if (char === quoteChar) {
        quoteChar = null;
      }
      current += char;
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts.reduce((acc, part) => acc && acc[part], obj);
};

export const parseView = ({ h, template, viewData, refs, handlers }) => {
  const result = jemplRender(template, viewData, {});

  // Flatten the array carefully to maintain structure
  const flattenedResult = flattenArrays(result);

  const childNodes = createVirtualDom({
    h,
    items: flattenedResult,
    refs,
    handlers,
    viewData,
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
  viewData = {}
}) => {
  if (!Array.isArray(items)) {
    console.error("Input to createVirtualDom must be an array.");
    return [h("div", {}, [])];
  }

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

        // Handle web components (tags with hyphens)
        const tagName = selector.split(/[.#]/)[0];
        const isWebComponent = tagName.includes("-");

        // 1. Parse attributes from attrsString
        const attrs = {}; // Ensure attrs is always an object
        const props = {};
        if (attrsString) {
          // First, handle attributes with values
          const attrRegex = /(\S+?)=(?:\"([^\"]*)\"|\'([^\']*)\'|([^\s]+))/g;
          let match;
          const processedAttrs = new Set();
          
          while ((match = attrRegex.exec(attrsString)) !== null) {
            processedAttrs.add(match[1]);
            if (match[1].startsWith(".")) {
              const propName = match[1].substring(1);
              const valuePathName = match[4];
              props[propName] = lodashGet(viewData, valuePathName);
            } else if (match[1].startsWith("?")) {
              // Handle conditional boolean attributes
              const attrName = match[1].substring(1);
              const attrValue = match[2] || match[3] || match[4];
              
              // Convert string values to boolean
              let evalValue;
              if (attrValue === "true") {
                evalValue = true;
              } else if (attrValue === "false") {
                evalValue = false;
              } else {
                // Try to get from viewData if it's not a literal boolean
                evalValue = lodashGet(viewData, attrValue);
              }
              
              // Only add attribute if value is truthy
              if (evalValue) {
                attrs[attrName] = "";
              }
            } else {
              attrs[match[1]] = match[2] || match[3] || match[4];
            }
          }
          
          // Then, handle boolean attributes without values
          // Remove all processed attribute-value pairs from the string first
          let remainingAttrsString = attrsString;
          const processedMatches = [];
          let tempMatch;
          const tempAttrRegex = /(\S+?)=(?:\"([^\"]*)\"|\'([^\']*)\'|([^\s]+))/g;
          while ((tempMatch = tempAttrRegex.exec(attrsString)) !== null) {
            processedMatches.push(tempMatch[0]);
          }
          // Remove all matched attribute=value pairs
          processedMatches.forEach(match => {
            remainingAttrsString = remainingAttrsString.replace(match, ' ');
          });
          
          const booleanAttrRegex = /\b(\S+?)(?=\s|$)/g;
          let boolMatch;
          while ((boolMatch = booleanAttrRegex.exec(remainingAttrsString)) !== null) {
            const attrName = boolMatch[1];
            // Skip if already processed or starts with . (prop) or contains =
            if (!processedAttrs.has(attrName) && !attrName.startsWith(".") && !attrName.includes("=")) {
              attrs[attrName] = "";
            }
          }
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
        // This should be the actual ID that will be on the DOM element.
        let elementIdForRefs = null;
        if (attrs.id) {
          // Check the definitive id from attrs object
          elementIdForRefs = attrs.id;
        } else if (isWebComponent) {
          // Fallback for web components that don't end up with an 'id' attribute
          elementIdForRefs = tagName;
        }

        // Extract classes and ID from selector (if not a web component)
        const classObj = Object.create(null); // Using Object.create(null) to avoid prototype issues
        let elementId = null;

        if (!isWebComponent) {
          const classMatches = selector.match(/\.([^.#]+)/g);
          if (classMatches) {
            classMatches.forEach((classMatch) => {
              const className = classMatch.substring(1);
              classObj[className] = true;
            });
          }

          const idMatch = selector.match(/#([^.#\s]+)/);
          if (idMatch) {
            elementId = idMatch[1];
          }
        } else {
          // For web components, use the tag name as the element ID for event binding
          elementId = tagName;
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

        // Add id to attributes if it exists and it's not a web component
        if (elementId && !isWebComponent) {
          attrs.id = elementId;
        }

        // Apply event listeners
        const eventHandlers = Object.create(null);

        if (elementIdForRefs && refs) {
          const matchingRefKeys = [];
          Object.keys(refs).forEach((refKey) => {
            if (refKey.includes("*")) {
              const pattern =
                "^" +
                refKey
                  .replace(/[.*+?^${}()|[\\\]\\]/g, "\\$&")
                  .replace(/\\\*/g, ".*") +
                "$";
              try {
                const regex = new RegExp(pattern);
                if (regex.test(elementIdForRefs)) {
                  matchingRefKeys.push(refKey);
                }
              } catch (e) {
                // Keep this warning for invalid regex patterns
                console.warn(
                  `[Parser] Invalid regex pattern created from refKey '${refKey}': ${pattern}`,
                  e,
                );
              }
            } else {
              if (elementIdForRefs === refKey) {
                matchingRefKeys.push(refKey);
              }
            }
          });

          if (matchingRefKeys.length > 0) {
            matchingRefKeys.sort((a, b) => {
              const aIsExact = !a.includes("*");
              const bIsExact = !b.includes("*");
              if (aIsExact && !bIsExact) return -1;
              if (!aIsExact && bIsExact) return 1;
              return b.length - a.length;
            });

            const bestMatchRefKey = matchingRefKeys[0];

            if (refs[bestMatchRefKey] && refs[bestMatchRefKey].eventListeners) {
              const eventListeners = refs[bestMatchRefKey].eventListeners;
              Object.entries(eventListeners).forEach(
                ([eventType, eventConfig]) => {
                  if (eventConfig.handler && handlers[eventConfig.handler]) {
                    eventHandlers[eventType] = (event) => {
                      handlers[eventConfig.handler](event);
                    };
                  } else if (eventConfig.handler) {
                    // Keep this warning for missing handlers
                    console.warn(
                      `[Parser] Handler '${eventConfig.handler}' for refKey '${bestMatchRefKey}' (matching elementId '${elementIdForRefs}') is referenced but not found in available handlers.`,
                    );
                  }
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

          // Include props in key if they exist for better change detection
          if (Object.keys(props).length > 0) {
            const propsHash = JSON.stringify(props).substring(0, 50); // Limit length
            snabbdomData.key += `-${propsHash}`;
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

        // For web components, add a hook to detect prop and attr changes
        if (isWebComponent) {
          snabbdomData.hook = {
            update: (oldVnode, vnode) => {
              const oldProps = oldVnode.data?.props || {};
              const newProps = vnode.data?.props || {};
              const oldAttrs = oldVnode.data?.attrs || {};
              const newAttrs = vnode.data?.attrs || {};

              // Check if props have changed
              const propsChanged =
                JSON.stringify(oldProps) !== JSON.stringify(newProps);

              // Check if attrs have changed
              const attrsChanged =
                JSON.stringify(oldAttrs) !== JSON.stringify(newAttrs);

              if (propsChanged || attrsChanged) {
                // Set isDirty attribute and trigger re-render
                const element = vnode.elm;
                if (
                  element &&
                  element.render &&
                  typeof element.render === "function"
                ) {
                  element.setAttribute("isDirty", "true");
                  requestAnimationFrame(() => {
                    element.render();
                    element.removeAttribute("isDirty");
                    // Call the specific component's handleOnUpdate instead of the parent's onUpdate
                    if (element.handlers && element.handlers.handleOnUpdate) {
                      const deps = {
                        ...(element.deps || {}),
                        store: element.store,
                        render: element.render.bind(element),
                        handlers: element.handlers,
                        dispatchEvent: element.dispatchEvent.bind(element),
                        refIds: element.refIds || {},
                        getRefIds: () => element.refIds || {},
                      };
                      element.handlers.handleOnUpdate({
                        oldProps,
                        newProps,
                        oldAttrs,
                        newAttrs,
                      }, deps);
                    }
                  });
                }
              }
            },
          };
        }

        try {
          // For web components, use only the tag name without any selectors
          if (isWebComponent) {
            // For web components, we need to use just the tag name
            return h(tagName, snabbdomData, childrenOrText);
          } else {
            // For regular elements, we can use the original selector or just the tag
            return h(tagName, snabbdomData, childrenOrText);
          }
        } catch (error) {
          console.error("Error creating virtual node:", error, {
            tagName,
            snabbdomData,
            childrenOrText,
          });
          // Fallback to a simple div
          return h("div", {}, ["Error creating element"]);
        }
      })
      .filter(Boolean);
  }

  return processItems(items);
};
