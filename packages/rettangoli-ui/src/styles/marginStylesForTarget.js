import { generateCSS, spacing } from "../common.js";

const styles = {
  mt: spacing,
  mr: spacing,
  mb: spacing,
  ml: spacing,
  m: spacing,
  mh: spacing,
  mv: spacing,
};

export default (targetSelector) => generateCSS(styles, {}, targetSelector);
