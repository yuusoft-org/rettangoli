const unauthorizedError = () => {
  const error = new Error('Unauthorized');
  error.code = -32001;
  error.data = { reason: 'auth_required' };
  return error;
};

const userNotFoundError = (userId) => {
  const error = new Error('User not found');
  error.code = -32010;
  error.data = { userId };
  return error;
};

export const createUserGetProfileMethod = ({ userDao }) => {
  if (!userDao?.findById) {
    throw new Error('createUserGetProfileMethod: userDao.findById is required');
  }

  return {
    'user.getProfile': async ({ context }) => {
      if (!context.authUser?.userId) {
        throw unauthorizedError();
      }

      const user = await userDao.findById({ userId: context.authUser.userId });

      if (!user) {
        throw userNotFoundError(context.authUser.userId);
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    },
  };
};
