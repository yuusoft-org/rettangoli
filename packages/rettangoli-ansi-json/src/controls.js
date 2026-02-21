/**
 * @fileoverview Control node rendering
 */

import { resolveStyle, mergeStyles, applyStyle } from './style.js';

const ESC = '\x1b';
const BEL = '\x07';

/**
 * Render a control node.
 * @param {object} node - Control node
 * @param {object} styles - Named styles dictionary
 * @param {object} inheritedStyle - Style inherited from parent
 * @returns {string} ANSI escape sequence
 */
export function renderControl(node, styles, inheritedStyle = {}) {
  switch (node.ctrl) {
    case 'cursor':
      return renderCursor(node);
    case 'clear':
      return renderClear(node);
    case 'scroll':
      return renderScroll(node);
    case 'scrollRegion':
      return renderScrollRegion(node);
    case 'title':
      return `${ESC}]0;${node.text}${BEL}`;
    case 'link':
      return renderLink(node, styles, inheritedStyle);
    case 'altBuffer':
      return `${ESC}[?1049${node.enable ? 'h' : 'l'}`;
    case 'reset':
      return `${ESC}[0m`;
    case 'bell':
      return BEL;
    case 'clipboard':
      return renderClipboard(node);
    case 'raw':
      return `${ESC}${node.sequence}`;
    default:
      return '';
  }
}

/**
 * Render cursor control.
 * @param {object} node
 * @returns {string}
 */
function renderCursor(node) {
  let out = '';
  if (node.to) out += `${ESC}[${node.to.row};${node.to.col}H`;
  if (node.up) out += `${ESC}[${node.up}A`;
  if (node.down) out += `${ESC}[${node.down}B`;
  if (node.right) out += `${ESC}[${node.right}C`;
  if (node.left) out += `${ESC}[${node.left}D`;
  if (node.nextLine) out += `${ESC}[${node.nextLine}E`;
  if (node.prevLine) out += `${ESC}[${node.prevLine}F`;
  if (node.col) out += `${ESC}[${node.col}G`;
  if (node.show) out += `${ESC}[?25h`;
  if (node.hide) out += `${ESC}[?25l`;
  if (node.save) out += `${ESC}[s`;
  if (node.restore) out += `${ESC}[u`;
  return out;
}

/**
 * Render clear control.
 * @param {object} node
 * @returns {string}
 */
function renderClear(node) {
  const modes = {
    screen: '2J', screenEnd: '0J', screenStart: '1J', screenAll: '3J',
    line: '2K', lineEnd: '0K', lineStart: '1K'
  };
  return `${ESC}[${modes[node.mode] || '2J'}`;
}

/**
 * Render scroll control.
 * @param {object} node
 * @returns {string}
 */
function renderScroll(node) {
  let out = '';
  if (node.up) out += `${ESC}[${node.up}S`;
  if (node.down) out += `${ESC}[${node.down}T`;
  return out;
}

/**
 * Render scroll region control.
 * @param {object} node
 * @returns {string}
 */
function renderScrollRegion(node) {
  if (node.reset) return `${ESC}[r`;
  if (node.top && node.bottom) return `${ESC}[${node.top};${node.bottom}r`;
  return '';
}

/**
 * Render link control.
 * @param {object} node
 * @param {object} styles
 * @param {object} inheritedStyle
 * @returns {string}
 */
function renderLink(node, styles, inheritedStyle) {
  const resolvedStyle = mergeStyles(inheritedStyle, resolveStyle(node.style, styles));
  const styledText = Object.keys(resolvedStyle).length > 0 
    ? applyStyle(node.text, resolvedStyle) 
    : node.text;
  return `${ESC}]8;;${node.url}${BEL}${styledText}${ESC}]8;;${BEL}`;
}

/**
 * Render clipboard control.
 * @param {object} node
 * @returns {string}
 */
function renderClipboard(node) {
  const target = { clipboard: 'c', primary: 'p', select: 's' }[node.target || 'clipboard'];
  const encoded = Buffer.from(node.content).toString('base64');
  return `${ESC}]52;${target};${encoded}${BEL}`;
}
