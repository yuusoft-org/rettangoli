export const withLogger = () => {
  return (next) => async (ctx) => {
    ctx.logger = ctx.logger?.child
      ? ctx.logger.child({ requestId: ctx.requestId })
      : ctx.logger;

    return next(ctx);
  };
};
