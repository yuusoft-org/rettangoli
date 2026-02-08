export const scheduleFrame = (
  callback,
  requestAnimationFrameFn = requestAnimationFrame,
) => {
  return requestAnimationFrameFn(callback);
};
