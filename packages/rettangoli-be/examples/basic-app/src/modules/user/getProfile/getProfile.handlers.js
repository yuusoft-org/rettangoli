export const userGetProfileMethod = async ({ context, deps }) => {
  if (!deps?.userDao?.findById) {
    throw new Error('userGetProfileMethod: deps.userDao.findById is required');
  }

  if (!context.authUser?.userId) {
    return {
      _error: true,
      type: 'AUTH_REQUIRED',
      details: { reason: 'auth_required' },
    };
  }

  const user = await deps.userDao.findById({ userId: context.authUser.userId });

  if (!user) {
    return {
      _error: true,
      type: 'USER_NOT_FOUND',
      details: { userId: context.authUser.userId },
    };
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
};
