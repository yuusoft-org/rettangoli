import { generateCSS } from "../common.js";

const styles = {
  s: {
    sm: `
      height: 20px;
      padding-left: 8px;
      padding-right: 8px;
      gap: 6px;
      font-size: var(--xs-font-size);
      font-weight: var(--xs-font-weight);
      line-height: var(--xs-line-height);
      letter-spacing: var(--xs-letter-spacing);
      --rtgl-tag-icon-size: 10px;
      --rtgl-tag-remove-size: 14px;
    `,
    md: `
      height: 24px;
      padding-left: 10px;
      padding-right: 10px;
      gap: 6px;
      font-size: var(--xs-font-size);
      font-weight: var(--xs-font-weight);
      line-height: var(--xs-line-height);
      letter-spacing: var(--xs-letter-spacing);
      --rtgl-tag-icon-size: 12px;
      --rtgl-tag-remove-size: 16px;
    `,
    lg: `
      height: 28px;
      padding-left: 12px;
      padding-right: 12px;
      gap: 8px;
      font-size: var(--sm-font-size);
      font-weight: var(--sm-font-weight);
      line-height: var(--sm-line-height);
      letter-spacing: var(--sm-letter-spacing);
      --rtgl-tag-icon-size: 14px;
      --rtgl-tag-remove-size: 18px;
    `,
  },
  v: {
    mu: `
      background-color: var(--muted);
      color: var(--muted-foreground);
      border-color: var(--border);
    `,
    pr: `
      background-color: var(--primary);
      color: var(--primary-foreground);
      border-color: transparent;
    `,
    se: `
      background-color: var(--secondary);
      color: var(--secondary-foreground);
      border-color: transparent;
    `,
    ac: `
      background-color: var(--accent);
      color: var(--accent-foreground);
      border-color: transparent;
    `,
    de: `
      background-color: var(--destructive);
      color: var(--destructive-foreground);
      border-color: transparent;
    `,
    ol: `
      background-color: transparent;
      color: var(--foreground);
      border-color: var(--border);
    `,
    gh: `
      background-color: transparent;
      color: var(--foreground);
      border-color: transparent;
    `,
  },
};

export default generateCSS(styles, {}, ".surface");
