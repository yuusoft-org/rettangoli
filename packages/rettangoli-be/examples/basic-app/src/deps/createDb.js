export const createDb = ({ url }) => {
  if (!url) throw new Error('createDb: url is required');

  const users = new Map();
  users.set('u-1', {
    id: 'u-1',
    email: 'demo@example.com',
    role: 'user',
  });

  return {
    user: {
      findById: async (id) => users.get(id),
    },
  };
};
