export const withAuthUser = () => {
  return (next) => async (ctx) => {
    const token = ctx.cookies?.request?.session;

    if (!token) {
      ctx.authUser = undefined;
      return next(ctx);
    }

    // Placeholder decode/verify flow for design review.
    ctx.authUser = { userId: 'u-1', scopes: ['user'] };
    ctx.cookies ??= { request: {}, response: [] };
    ctx.cookies.response ??= [];

    ctx.cookies.response.push({
      name: 'session',
      value: token,
      config: {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 2592000,
      },
    });

    return next(ctx);
  };
};
