import { generateCSS } from "../common.js";

const styles = {
  c: {
    "fg": "--foreground",
    "de": "--destructive",
    "pr-fg": "--primary-foreground",
    "se-fg": "--secondary-foreground",
    "mu-fg": "--muted-foreground",
    "ac-fg": "--accent-foreground",
  },
};

export default generateCSS(styles);
