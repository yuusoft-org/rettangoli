import { generateCSS } from "../common.js";

const styles = {
  c: {
    "fg": "color: var(--foreground);",
    "de": "color: var(--destructive);",
    "pr-fg": "color: var(--primary-foreground);",
    "se-fg": "color: var(--secondary-foreground);",
    "mu-fg": "color: var(--muted-foreground);",
    "ac-fg": "color: var(--accent-foreground);",
  },
};

export default generateCSS(styles);
