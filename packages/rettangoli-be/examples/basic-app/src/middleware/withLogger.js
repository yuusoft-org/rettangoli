export const withLogger = () => {
  return (next) => async (ctx) => {
    if (ctx.meta?.headers?.['x-e2e-throw-middleware'] === '1') {
      throw new Error('withLogger: forced middleware failure');
    }

    ctx.logger = ctx.logger?.child
      ? ctx.logger.child({ requestId: ctx.requestId })
      : ctx.logger;

    return next(ctx);
  };
};
