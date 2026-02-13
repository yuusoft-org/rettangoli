import userGetProfileSchema from './getProfile/getProfile.schema.yaml';
import { createUserGetProfileMethod } from './getProfile/getProfile.handlers.js';

export const registerUserModule = ({ deps }) => {
  if (!deps?.userDao?.findById) {
    throw new Error('registerUserModule: deps.userDao.findById is required');
  }

  return {
    name: 'user',
    methods: {
      ...createUserGetProfileMethod({ userDao: deps.userDao }),
    },
    contracts: {
      'user.getProfile': {
        paramsSchema: userGetProfileSchema.paramsSchema,
        resultSchema: userGetProfileSchema.resultSchema,
      },
    },
  };
};
