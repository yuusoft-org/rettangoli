const TOTAL_STEPS = 4;

export const createInitialState = () => ({
  currentStep: 1,
});

export const selectViewData = ({ state }) => ({
  currentStep: state.currentStep,
  isStep1: state.currentStep === 1,
  isStep2: state.currentStep === 2,
  isStep3: state.currentStep === 3,
  isStep4: state.currentStep === 4,
  dots: Array(TOTAL_STEPS).fill(null).map((_, i) => ({
    color: i < state.currentStep ? 'dodgerblue' : '#ddd',
  })),
});

export const nextStep = ({ state }) => {
  if (state.currentStep < TOTAL_STEPS) state.currentStep += 1;
};

export const prevStep = ({ state }) => {
  if (state.currentStep > 1) state.currentStep -= 1;
};
