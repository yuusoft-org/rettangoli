/**
 * @fileoverview Core rendering logic for AnsiJson documents
 */

import { resolveStyle, mergeStyles, applyStyle } from './style.js';
import { renderControl } from './controls.js';

/**
 * Convert an AnsiJson document to an ANSI string.
 * @param {object} doc - AnsiJson document
 * @returns {string} ANSI escape sequence string
 */
export function render(doc) {
  const { styles = {}, content } = doc;
  return renderNodes(content, styles, {});
}

/**
 * Render an array of nodes.
 * @param {Array} nodes - Content nodes
 * @param {object} styles - Named styles
 * @param {object} inheritedStyle - Style inherited from parent
 * @returns {string}
 */
function renderNodes(nodes, styles, inheritedStyle) {
  let out = '';
  for (const node of nodes) {
    out += renderNode(node, styles, inheritedStyle);
  }
  return out;
}

/**
 * Render a single node.
 * @param {string|object} node - Content node
 * @param {object} styles - Named styles
 * @param {object} inheritedStyle - Style inherited from parent
 * @returns {string}
 */
function renderNode(node, styles, inheritedStyle) {
  // Plain string
  if (typeof node === 'string') {
    return applyStyle(node, inheritedStyle);
  }

  // Control node (check first - some controls have 'text' property)
  if ('ctrl' in node) {
    return renderControl(node, styles, inheritedStyle);
  }

  // Text node
  if ('text' in node) {
    const style = mergeStyles(inheritedStyle, resolveStyle(node.style, styles));
    return applyStyle(node.text, style);
  }

  // Span node (children with inheritance)
  if ('children' in node) {
    const style = mergeStyles(inheritedStyle, resolveStyle(node.style, styles));
    return renderNodes(node.children, styles, style);
  }

  return '';
}
