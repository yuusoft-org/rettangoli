import { generateCSS, spacing } from "../common.js";

const borderWidth = {
  xs: "--border-width-xs",
  sm: "--border-width-sm",
  md: "--border-width-md",
  lg: "--border-width-lg",
  xl: "--border-width-xl",
}

const styles = {
  bgc: {
    pr: `
    background-color: var(--primary);
    `,
    se: `
    background-color: var(--secondary);
    `,
    de: `
    background-color: var(--destructive);
    `,
    fg: `
    background-color: var(--foreground);
    `,
    bg: `
    background-color: var(--background);
    `,
    mu: `
    background-color: var(--muted);
    `,
    ac: `
    background-color: var(--accent);
    `,
    bo: `
    background-color: var(--border);
    `,
  },
  pos: {
    rel: "relative",
    abs: "absolute",
    fix: "fixed",
  },
  edge: {
    f: `
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        height: 100%;
        `,
    t: `
        top: 0;
        right: 0;
        left: 0;
        `,
    r: `
        top: 0;
        right: 0;
        bottom: 0;
        height: 100%;
        `,
    b: `
        right: 0;
        bottom: 0;
        left: 0;
        `,
    l: `
        bottom: 0;
        left: 0;
        top: 0;
        height: 100%;
        `,
  },
  shadow: {
    sm: "--shadow-sm",
    md: "--shadow-md",
    lg: "--shadow-lg",
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
    pr: "--primary",
    se: "--secondary",
    de: "--destructive",
    fg: "--foreground",
    bg: "--background",
    mu: "--muted",
    ac: "--accent",
    bo: "--border",
    tr: "transparent",
  },
  br: {
    xs: "--border-radius-xs",
    sm: "--border-radius-sm",
    md: "--border-radius-md",
    lg: "--border-radius-lg",
    xl: "--border-radius-xl",
    f: "--border-radius-f",
  },
};

export default generateCSS(styles)
