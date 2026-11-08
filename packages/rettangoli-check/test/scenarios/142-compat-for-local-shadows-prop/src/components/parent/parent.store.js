export const createInitialState = () => ({});

export const selectViewData = ({ props }) => {
  return {
    rows: [{ label: props.item || "a" }, { label: "b" }],
  };
};
