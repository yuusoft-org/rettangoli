export const responsiveStyleSizes = ["default", "sm", "md", "lg", "xl"];

// Split only supported responsive prefixes; base names may contain hyphens.
export const parseResponsiveStyleAttribute = (name) => {
  const prefix = name.slice(0, 2);
  if (name[2] === "-" && responsiveStyleSizes.includes(prefix)) {
    return { attribute: name.slice(3), size: prefix };
  }
  return { attribute: name, size: "default" };
};

export const createResponsiveStyleBuckets = () => {
  return responsiveStyleSizes.reduce((acc, size) => {
    acc[size] = {};
    return acc;
  }, {});
};

const responsiveBreakpointsSmallToLarge = ["sm", "md", "lg", "xl"];

const getResponsiveAttributeName = ({ size, attr }) => {
  return size === "default" ? attr : `${size}-${attr}`;
};

export const getResponsiveFallbackSizes = ({ size, includeDefault = true }) => {
  if (size === "default") {
    return ["default"];
  }

  const sizeIndex = responsiveBreakpointsSmallToLarge.indexOf(size);
  if (sizeIndex === -1) {
    return includeDefault ? ["default"] : [];
  }

  const fallbackSizes = responsiveBreakpointsSmallToLarge.slice(sizeIndex);
  if (includeDefault) {
    fallbackSizes.push("default");
  }

  return fallbackSizes;
};

export const getResponsiveAttribute = ({
  element,
  size,
  attr,
  includeDefault = true,
}) => {
  const fallbackSizes = getResponsiveFallbackSizes({
    size,
    includeDefault,
  });

  for (const fallbackSize of fallbackSizes) {
    const attrName = getResponsiveAttributeName({
      size: fallbackSize,
      attr,
    });
    const value = element.getAttribute(attrName);
    if (value !== null) {
      return value;
    }
  }

  return null;
};

export const hasResponsiveAttribute = ({
  element,
  size,
  attr,
  includeDefault = true,
}) => {
  const fallbackSizes = getResponsiveFallbackSizes({
    size,
    includeDefault,
  });

  return fallbackSizes.some((fallbackSize) => {
    const attrName = getResponsiveAttributeName({
      size: fallbackSize,
      attr,
    });
    return element.hasAttribute(attrName);
  });
};

// Rebuilds the style bucket of changedSize, or of every size when it is
// undefined. Other sizes keep their bucket object. buildStyles receives the new
// bucket, the size and attrName, which maps a base attribute name to its name
// at that size ("w" -> "md-w").
export const rebuildResponsiveStyles = ({ styles, changedSize, buildStyles }) => {
  const sizes = changedSize === undefined ? responsiveStyleSizes : [changedSize];
  sizes.forEach((size) => {
    const styleBucket = {};
    styles[size] = styleBucket;
    buildStyles({
      styleBucket,
      size,
      attrName: (attr) => getResponsiveAttributeName({ size, attr }),
    });
  });
};

export const applyZIndexAndOpacity = ({ styleBucket, element, attrName }) => {
  const zIndex = element.getAttribute(attrName("z"));
  const opacity = element.getAttribute(attrName("op"));

  if (zIndex !== null) {
    styleBucket["z-index"] = zIndex;
  }

  if (opacity !== null) {
    styleBucket.opacity = opacity;
  }
};

// hide sets display: none; show sets the primitive's own display and wins.
export const applyVisibility = ({ styleBucket, element, attrName, display }) => {
  if (element.hasAttribute(attrName("hide"))) {
    styleBucket.display = "none";
  }

  if (element.hasAttribute(attrName("show"))) {
    styleBucket.display = display;
  }
};

// sh, sv and overflow also apply at smaller breakpoints, so a size inherits
// them from larger sizes and the default. noWrap adds flex-wrap: nowrap
// whenever the element scrolls or clips.
export const applyScrollStyles = ({
  styleBucket,
  element,
  size,
  noWrap = false,
}) => {
  const scrollHorizontal = hasResponsiveAttribute({ element, size, attr: "sh" });
  const scrollVertical = hasResponsiveAttribute({ element, size, attr: "sv" });
  const overflow = getResponsiveAttribute({ element, size, attr: "overflow" });

  if (scrollHorizontal && scrollVertical) {
    styleBucket.overflow = "auto";
    styleBucket["scrollbar-gutter"] = "auto";
    styleBucket["--rtgl-scrollbar-x-enabled"] = "1";
    styleBucket["--rtgl-scrollbar-y-enabled"] = "1";
  } else if (scrollHorizontal) {
    styleBucket["overflow-x"] = "auto";
    styleBucket["overflow-y"] = "hidden";
    styleBucket["scrollbar-gutter"] = "auto";
    styleBucket["--rtgl-scrollbar-x-enabled"] = "1";
    styleBucket["--rtgl-scrollbar-y-enabled"] = "0";
  } else if (scrollVertical) {
    styleBucket["overflow-x"] = "hidden";
    styleBucket["overflow-y"] = "auto";
    styleBucket["scrollbar-gutter"] = "auto";
    styleBucket["--rtgl-scrollbar-x-enabled"] = "0";
    styleBucket["--rtgl-scrollbar-y-enabled"] = "1";
  }
  if (noWrap && (scrollHorizontal || scrollVertical)) {
    styleBucket["flex-wrap"] = "nowrap";
  }

  if (overflow === "hidden") {
    styleBucket.overflow = "hidden";
    styleBucket["--rtgl-scrollbar-x-enabled"] = "0";
    styleBucket["--rtgl-scrollbar-y-enabled"] = "0";
    if (noWrap) {
      styleBucket["flex-wrap"] = "nowrap";
    }
  }
};

// Writes the generated CSS into the element's <style> only when it changed.
export const commitStyleText = (element, styleText) => {
  if (styleText !== element._lastStyleString) {
    element._styleElement.textContent = styleText;
    element._lastStyleString = styleText;
  }
};
