export const EXIT_CODE = {
  SUCCESS: 0,
  FAILURE: 1,
};

export const EXIT_CODE_MATRIX = [
  {
    code: EXIT_CODE.SUCCESS,
    name: "SUCCESS",
    description: "Command completed without blocking diagnostics or runtime failure.",
  },
  {
    code: EXIT_CODE.FAILURE,
    name: "FAILURE",
    description: "Command failed due to diagnostics, invalid CLI input, or runtime error.",
  },
];
