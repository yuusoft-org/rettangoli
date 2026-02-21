/**
 * @fileoverview Style resolution, merging, and SGR code generation
 */

import { colorToCodes } from './colors.js';

const ESC = '\x1b';

/**
 * Resolve a style reference to a style object.
 * @param {string|object|undefined} styleRef - Style reference or object
 * @param {object} styles - Named styles dictionary
 * @returns {object} Resolved style object
 */
export function resolveStyle(styleRef, styles) {
  if (!styleRef) return {};
  if (typeof styleRef === 'string') {
    return styles[styleRef] || {};
  }
  return styleRef;
}

/**
 * Merge two style objects.
 * @param {object} base - Base style
 * @param {object} override - Override style
 * @returns {object} Merged style
 */
export function mergeStyles(base, override) {
  return { ...base, ...override };
}

/**
 * Apply style to text, returning styled string.
 * @param {string} text - Text to style
 * @param {object} style - Style object
 * @returns {string} Styled text with ANSI codes
 */
export function applyStyle(text, style) {
  // Don't wrap empty text with escape codes
  if (text === '') {
    return text;
  }
  if (!style || Object.keys(style).length === 0) {
    return text;
  }
  const codes = styleToCodes(style);
  if (codes.length === 0) {
    return text;
  }
  return `${ESC}[${codes.join(';')}m${text}${ESC}[0m`;
}

/**
 * Convert style object to SGR codes.
 * @param {object} style - Style object
 * @returns {number[]} Array of SGR codes
 */
export function styleToCodes(style) {
  const codes = [];

  if (style.bold) codes.push(1);
  if (style.dim) codes.push(2);
  if (style.italic) codes.push(3);
  if (style.underline === true) codes.push(4);
  if (style.underline === 'double') codes.push(21);
  if (style.blink === true) codes.push(5);
  if (style.blink === 'rapid') codes.push(6);
  if (style.reverse) codes.push(7);
  if (style.hidden) codes.push(8);
  if (style.strike) codes.push(9);
  if (style.overline) codes.push(53);

  if (style.fg !== undefined) codes.push(...colorToCodes(style.fg, false));
  if (style.bg !== undefined) codes.push(...colorToCodes(style.bg, true));

  return codes;
}
