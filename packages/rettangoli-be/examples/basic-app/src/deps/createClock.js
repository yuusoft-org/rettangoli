export const createClock = () => {
  return {
    now: () => Date.now(),
    isoNow: () => new Date().toISOString(),
  };
};
