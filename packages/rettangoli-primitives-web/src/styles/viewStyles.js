import { generateCSS, spacing } from "../common.js";

const borderWidth = {
  xs: "--border-width-xs",
  s: "--border-width-s",
  m: "--border-width-m",
  l: "--border-width-l",
  xl: "--border-width-xl",
}

const styles = {
  bgc: {
    p:  `
    background-color: var(--color-primary);
    color: var(--color-on-primary);
    `,
    pc: `
    background-color: var(--color-primary-container);
    color: var(--color-on-primary-container);
    `,
    s: `
    background-color: var(--color-secondary);
    color: var(--color-on-secondary);
    `,
    sc: `
    background-color: var(--color-secondary-container);
    color: var(--color-on-secondary-container);
    `,
    e: `
    background-color: var(--color-error);
    color: var(--color-on-error);
    `,
    ec: `
    background-color: var(--color-error-container);
    color: var(--color-on-error-container);
    `,
    su: `
    background-color: var(--color-surface);
    color: var(--color-on-surface);
    `,
    sucl: `
    background-color: var(--color-surface-container-low);
    color: var(--color-on-surface);
    `,
    suc: `
    background-color: var(--color-surface-container);
    color: var(--color-on-surface);
    `,
    such: `
    background-color: var(--color-surface-container-high);
    color: var(--color-on-surface);
    `,
    isu: `
    background-color: var(--color-inverse-surface);
    color: var(--color-inverse-on-surface);
    `,
    o: `
    background-color: var(--color-outline);
    `,
    ov: `
    background-color: var(--color-outline-variant);
    `,
  },
  pos: {
    rel: "relative",
    abs: "absolute",
    fix: "fixed",
  },
  cor: {
    full: `
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        height: 100%;
        `,
    top: `
        top: 0;
        right: 0;
        left: 0;
        `,
    right: `
        top: 0;
        right: 0;
        bottom: 0;
        height: 100%;
        `,
    bottom: `
        right: 0;
        bottom: 0;
        left: 0;
        `,
    left: `
        bottom: 0;
        left: 0;
        top: 0;
        height: 100%;
        `,
  },
  shadow: {
    s: "--shadow-s",
    m: "--shadow-m",
    l: "--shadow-l",
  },
  pt: spacing,
  pr: spacing,
  pb:spacing,
  pl: spacing,
  p: spacing,
  ph: spacing,
  pv: spacing,
  g: spacing,
  gv: spacing,
  gh: spacing,
  bw: borderWidth,
  bwt: borderWidth,
  bwr: borderWidth,
  bwb: borderWidth,
  bwl: borderWidth,
  bc: {
    p: "--color-primary",
    pc: "--color-primary-container",
    s: "--color-secondary",
    sc: "--color-secondary-container",
    e: "--color-error",
    ec: "--color-error-container",
    su: "--color-surface",
    sucl: "--color-surface-container-low",
    suc: "--color-surface-container",
    such: "--color-surface-container-high",
    isu: "--color-inverse-surface",
    o: "--color-outline",
    ov: "--color-outline-variant",
  },
  br: {
    xs: "--border-radius-xs",
    s: "--border-radius-s",
    m: "--border-radius-m",
    l: "--border-radius-l",
    xl: "--border-radius-xl",
    f: "--border-radius-f",
  },
};

export default generateCSS(styles)
