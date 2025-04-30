import { generateCSS, spacing } from "../common.js";

const styles = {
  mt: spacing,
  mr: spacing,
  mb: spacing,
  ml: spacing,
  m: spacing,
  mh: spacing,
  mv: spacing,
  s: {
    sm: `
    height: 28px;
    padding-left: 12px;
    padding-right: 12px;
    border-radius: 4px;
    font-size: var(--xs-font-size);
    font-weight: var(--xs-font-weight);
    line-height: var(--xs-line-height);
    letter-spacing: var(--xs-letter-spacing);
    `,
    md: `
    height: 32px;
    padding-left: 16px;
    padding-right: 16px;
    border-radius: 4px;
    font-size: var(--sm-font-size);
    font-weight: var(--sm-font-weight);
    line-height: var(--sm-line-height);
    letter-spacing: var(--sm-letter-spacing);
    `,
    lg: `
    height: 40px;
    padding-left: 20px;
    padding-right: 20px;
    border-radius: 4px;
    font-size: var(--md-font-size);
    font-weight: var(--md-font-weight);
    line-height: var(--md-line-height);
    letter-spacing: var(--md-letter-spacing);
    `,
  },
  v: {
    pr: `
      background-color: var(--primary);
      color: var(--primary-foreground);
    `,
    se: `
      background-color: var(--secondary);
      color: var(--secondary-foreground);
    `,
    de: `
      background-color: var(--destructive);
      color: var(--primary-foreground);
    `,
    ol: `
      background-color: transparent;
      color: var(--foreground);
      border-width: 1px;
    `,
    gh: `
      background-color: transparent;
      color: var(--foreground);
    `,
    lk: `
      background-color: transparent;
      color: var(--foreground);
    `,
  },
};

const descendants = {
  mt: "button",
  mr: "button",
  mb: "button",
  ml: "button",
  m: "button",
  mh: "button",
  mv: "button",
  s: "button",
  v: "button",
};

export default generateCSS(styles, descendants);
