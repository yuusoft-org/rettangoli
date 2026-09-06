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
