import { createClock } from './createClock.js';
import { createConfig } from './createConfig.js';
import { createDb } from './createDb.js';
import { createLogger } from './createLogger.js';
import { createOtpService } from './createOtpService.js';
import { createUserDao } from './createUserDao.js';

export const createDeps = ({ env }) => {
  const config = createConfig({ env });
  const db = createDb({ url: config.dbUrl });

  return {
    config,
    logger: createLogger({ level: config.logLevel }),
    clock: createClock(),
    db,
    userDao: createUserDao({ db }),
    otpService: createOtpService({ env }),
  };
};
