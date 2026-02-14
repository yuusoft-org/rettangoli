export const withRequestId = ({ createId }) => {
  if (!createId) throw new Error('withRequestId: createId is required');

  return (next) => async (ctx) => {
    ctx.requestId = ctx.requestId || createId();
    return next(ctx);
  };
};
