import { resolveTextContent } from "./common.js";

const styleTransforms = {
  h1: (value) => value.toUpperCase(),
  h2: (value) => value.toUpperCase(),
  lg: (value) => value,
  md: (value) => value,
  sm: (value) => value,
};

const withBold = (value) => `\u001b[1m${value}\u001b[22m`;

const renderText = ({ attrs, props, text, joinChildren }) => {
  const content = resolveTextContent({ text, joinChildren });
  const sizeToken = attrs.s || props.s;
  const weightToken = attrs.w || props.w;
  const transformed = styleTransforms[sizeToken]?.(content) || content;

  if (weightToken === "b" || weightToken === "bold" || weightToken === "700") {
    return withBold(transformed);
  }

  return transformed;
};

export default renderText;
