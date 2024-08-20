import { generateCSS, spacing } from "../common.js";

const styleMap = {
  mt: "margin-top",
  mr: "margin-right",
  mb: "margin-bottom",
  ml: "margin-left",
  m: "margin",
  mh: "margin-left margin-right",
  mv: "margin-top margin-bottom",
};

const styles = {
  mt: spacing,
  mr: spacing,
  mb: spacing,
  ml: spacing,
  m: spacing,
  mh: spacing,
  mv: spacing,
  
};

export default generateCSS(styleMap, styles)
