export const createInitialState = () => ({});

export const selectViewData = ({ locale }) => ({
  currentLocale: locale.current(),
});
