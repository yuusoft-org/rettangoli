export const withAuthUser = () => {
  return (next) => async (ctx) => {
    const token = ctx.meta?.headers?.authorization;

    if (!token) {
      return next({ ...ctx, authUser: undefined });
    }

    // Placeholder decode/verify flow for design review.
    const authUser = { userId: 'u-1', scopes: ['user'] };

    return next({ ...ctx, authUser });
  };
};
