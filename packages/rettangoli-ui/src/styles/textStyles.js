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
  s: {
    dm: `
        font-size: var(--typography-display-m-font-size);
        font-weight: var(--typography-display-m-font-weight);
        line-height: var(--typography-display-m-line-height);
        letter-spacing: var(--typography-display-m-letter-spacing);
      `,
    hm: `
        font-size: var(--typography-headline-m-font-size);
        font-weight: var(--typography-headline-m-font-weight);
        line-height: var(--typography-headline-m-line-height);
        letter-spacing: var(--typography-headline-m-letter-spacing);
      `,
    tl: `
        font-size: var(--typography-title-l-font-size);
        font-weight: var(--typography-title-l-font-weight);
        line-height: var(--typography-title-l-line-height);
        letter-spacing: var(--typography-title-l-letter-spacing);
      `,
    tm: `
        font-size: var(--typography-title-m-font-size);
        font-weight: var(--typography-title-m-font-weight);
        line-height: var(--typography-title-m-line-height);
        letter-spacing: var(--typography-title-m-letter-spacing);
      `,
    ts: `
        font-size: var(--typography-title-s-font-size);
        font-weight: var(--typography-title-s-font-weight);
        line-height: var(--typography-title-s-line-height);
        letter-spacing: var(--typography-title-s-letter-spacing);
      `,
    bl: `
        font-size: var(--typography-body-l-font-size);
        font-weight: var(--typography-body-l-font-weight);
        line-height: var(--typography-body-l-line-height);
        letter-spacing: var(--typography-body-l-letter-spacing);
      `,
    bm: `
        font-size: var(--typography-body-m-font-size);
        font-weight: var(--typography-body-m-font-weight);
        line-height: var(--typography-body-m-line-height);
        letter-spacing: var(--typography-body-m-letter-spacing);
      `,
    bs: `
        font-size: var(--typography-body-s-font-size);
        font-weight: var(--typography-body-s-font-weight);
        line-height: var(--typography-body-s-line-height);
        letter-spacing: var(--typography-body-s-letter-spacing);
      `,
    ll: `
        font-size: var(--typography-label-l-font-size);
        font-weight: var(--typography-label-l-font-weight);
        line-height: var(--typography-label-l-line-height);
        letter-spacing: var(--typography-label-l-letter-spacing);
      `,
    lm: `
        font-size: var(--typography-label-m-font-size);
        font-weight: var(--typography-label-m-font-weight);
        line-height: var(--typography-label-m-line-height);
        letter-spacing: var(--typography-label-m-letter-spacing);
      `,
  },
};

export default generateCSS(styleMap, styles);
