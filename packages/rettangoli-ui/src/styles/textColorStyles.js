import { generateCSS } from "../common.js";

const styleMap = {
  c: "color",
};

const styles = {
  c: {
    "on-p": "--color-on-primary",
    "on-pc": "--color-on-primary-container",
    "on-s": "--color-on-secondary",
    "on-sc": "--color-on-secondary-container",
    "on-su": "--color-on-surface",
    "on-su-v": "--color-on-surface-variant",
    "i-on-su": "--color-inverse-on-surface",
    "on-e": "--color-on-error",
    "on-ec": "--color-on-error-container",
  },
};

export default generateCSS(styleMap, styles);
