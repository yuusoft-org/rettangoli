export const createUserDao = ({ db }) => {
  if (!db?.user?.findById) {
    throw new Error('createUserDao: db.user.findById is required');
  }

  return {
    findById: ({ userId }) => {
      if (!userId) throw new Error('createUserDao.findById: userId is required');
      return db.user.findById(userId);
    },
  };
};
