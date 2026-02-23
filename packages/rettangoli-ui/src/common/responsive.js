export const responsiveStyleSizes = ["default", "sm", "md", "lg", "xl"];

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

export const getResponsiveFallbackSizes = ({
  size,
  includeDefault = true,
}) => {
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
