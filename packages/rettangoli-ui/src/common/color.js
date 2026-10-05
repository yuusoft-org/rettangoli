const HEX_SHORTHAND_REGEX = /^[0-9a-f]{3}$/i;
const HEX_FULL_REGEX = /^[0-9a-f]{6}$/i;

// Accepts `abc`, `#abc`, `aabbcc`, and `#aabbcc`; returns null otherwise.
export function parseHex(value) {
  const raw = String(value ?? "").trim().replace(/^#/, "");
  if (HEX_SHORTHAND_REGEX.test(raw)) {
    return [...raw].map((char) => parseInt(char + char, 16));
  }
  if (HEX_FULL_REGEX.test(raw)) {
    return [0, 2, 4].map((index) => parseInt(raw.slice(index, index + 2), 16));
  }
  return null;
}

export function hsvToRgb({ h, s, v }) {
  const c = v * s;
  const hp = ((((h % 360) + 360) % 360) / 60);
  const x = c * (1 - Math.abs(hp % 2 - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [r + m, g + m, b + m].map((n) => Math.round(n * 255));
}

export const rgbToHex = (rgb) =>
  `#${rgb.map((n) => n.toString(16).padStart(2, "0")).join("")}`;

export const hsvToHex = (hsv) => rgbToHex(hsvToRgb(hsv));

// Keeps the previous hue at black and the previous saturation at pure black,
// so dragging through grey never snaps the hue back to red.
export function rgbToHsv([r, g, b], prev = { h: 0, s: 0, v: 0 }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = prev.h;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? prev.s : d / max, v: max };
}
