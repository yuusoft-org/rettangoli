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

const descendants = {
    mt: 'button',
    mr: 'button',
    mb: 'button',
    ml: 'button',
    m: 'button',
    mh: 'button',
    mv: 'button',
}

export default generateCSS(styles, descendants)
