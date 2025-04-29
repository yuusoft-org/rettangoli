import { generateCSS } from "../common.js";

const styles = {
  c: {
    "fg": "--foreground",
    "pr-fg": "--primary-foreground",
    "se-fg": "--secondary-foreground",
    "de-fg": "--destructive-foreground",
    "mu-fg": "--muted-foreground",
    "ac-fg": "--accent-foreground",
  },
};

export default generateCSS(styles);
