export const createMiddlewareChain = ({ middleware = [], finalHandler }) => {
  return middleware.reduceRight((next, currentMiddleware) => {
    return currentMiddleware(next);
  }, finalHandler);
};
