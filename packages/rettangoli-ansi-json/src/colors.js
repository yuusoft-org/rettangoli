/**
 * @fileoverview Color parsing and conversion to SGR codes
 */

/** Named color map to 256-color index */
const COLORS = {
  black: 0, red: 1, green: 2, yellow: 3,
  blue: 4, magenta: 5, cyan: 6, white: 7,
  brightBlack: 8, brightRed: 9, brightGreen: 10, brightYellow: 11,
  brightBlue: 12, brightMagenta: 13, brightCyan: 14, brightWhite: 15,
  default: -1
};

/**
 * Convert color to SGR codes.
 * @param {string|number} color - Color value
 * @param {boolean} isBg - Whether this is a background color
 * @returns {number[]} SGR codes
 */
export function colorToCodes(color, isBg) {
  const base = isBg ? 40 : 30;
  const brightBase = isBg ? 100 : 90;

  // Named color
  if (typeof color === 'string' && color in COLORS) {
    const idx = COLORS[color];
    if (idx === -1) return [isBg ? 49 : 39]; // default
    if (idx < 8) return [base + idx];
    return [brightBase + (idx - 8)];
  }

  // 256-color index
  if (typeof color === 'number') {
    return [isBg ? 48 : 38, 5, color];
  }

  // Hex color
  if (typeof color === 'string' && color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return [isBg ? 48 : 38, 2, r, g, b];
  }

  // RGB color
  if (typeof color === 'string' && color.startsWith('rgb(')) {
    const match = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (match) {
      return [isBg ? 48 : 38, 2, +match[1], +match[2], +match[3]];
    }
  }

  return [];
}
