import { generateCSS } from "../common.js";

const styles = {
  s: {
    sm: `
      height: 20px;
      padding-left: 8px;
      padding-right: 8px;
      gap: 6px;
      font-size: var(--xs-font-size);
      font-weight: 500;
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
      font-weight: 500;
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
      font-weight: 500;
      line-height: var(--sm-line-height);
      letter-spacing: var(--sm-letter-spacing);
      --rtgl-tag-icon-size: 14px;
      --rtgl-tag-remove-size: 18px;
    `,
  },
  // Soft tags: a tint of the variant's color with text in that color. Primary
  // is the one solid tag, and muted stays neutral.
  v: {
    mu: `
      background-color: var(--muted);
      color: var(--muted-foreground);
      border-color: transparent;
    `,
    pr: `
      background-color: var(--primary);
      color: var(--primary-foreground);
      border-color: transparent;
    `,
    se: `
      --rtgl-tag-tone: var(--foreground);
      background-color: color-mix(in oklch, var(--rtgl-tag-tone) 15%, transparent);
      color: color-mix(in oklch, var(--rtgl-tag-tone) 85%, var(--foreground));
      border-color: transparent;
    `,
    ac: `
      --rtgl-tag-tone: color-mix(in oklch, var(--ring) 65%, var(--foreground));
      background-color: color-mix(in oklch, var(--rtgl-tag-tone) 15%, transparent);
      color: color-mix(in oklch, var(--rtgl-tag-tone) 85%, var(--foreground));
      border-color: transparent;
    `,
    de: `
      --rtgl-tag-tone: var(--destructive);
      background-color: color-mix(in oklch, var(--rtgl-tag-tone) 15%, transparent);
      color: color-mix(in oklch, var(--rtgl-tag-tone) 85%, var(--foreground));
      border-color: transparent;
    `,
  },
};

export default generateCSS(styles, {}, ".surface");
