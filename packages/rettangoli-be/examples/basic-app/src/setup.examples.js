const logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => logger,
};

const users = new Map([
  ['u-1', {
    id: 'u-1',
    email: 'demo@example.com',
    role: 'user',
  }],
]);

export const setup = {
  deps: {
    health: {
      logger,
      now: () => 1700000000000,
    },
    user: {
      logger,
      userDao: {
        findById: async ({ userId }) => users.get(userId),
      },
    },
  },
};
