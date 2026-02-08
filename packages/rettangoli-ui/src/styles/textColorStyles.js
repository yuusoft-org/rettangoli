import { generateCSS } from "../common.js";

const styles = {
  c: {
    "pr": "color: var(--primary);",
    "se": "color: var(--secondary);",
    "de": "color: var(--destructive);",
    "fg": "color: var(--foreground);",
    "bg": "color: var(--background);",
    "mu": "color: var(--muted-foreground);",
    "ac": "color: var(--accent);",
    "bo": "color: var(--border);",
    "tr": "color: transparent;",
    "pr-fg": "color: var(--primary-foreground);",
    "se-fg": "color: var(--secondary-foreground);",
    "de-fg": "color: var(--destructive-foreground);",
    "mu-fg": "color: var(--muted-foreground);",
    "ac-fg": "color: var(--accent-foreground);",
  },
};

export default generateCSS(styles);
