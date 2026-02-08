export const responsiveStyleSizes = ["default", "sm", "md", "lg", "xl"];

export const createResponsiveStyleBuckets = () => {
  return responsiveStyleSizes.reduce((acc, size) => {
    acc[size] = {};
    return acc;
  }, {});
};
