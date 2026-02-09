export const handleNext = (deps) => {
  deps.store.nextStep({});
  deps.render();
};

export const handlePrev = (deps) => {
  deps.store.prevStep({});
  deps.render();
};
