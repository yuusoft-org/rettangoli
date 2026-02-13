import { createConfig } from './deps/createConfig.js';
import { createLogger } from './deps/createLogger.js';
import { createClock } from './deps/createClock.js';
import { createDb } from './deps/createDb.js';
import { createUserDao } from './deps/createUserDao.js';
import { createOtpService } from './deps/createOtpService.js';

const config = createConfig({ env: process.env });
const db = createDb({ url: config.dbUrl });
const logger = createLogger({ level: config.logLevel });
const clock = createClock();

export const setup = {
  port: Number(process.env.PORT || 3000),
  deps: {
    health: {
      config,
      logger,
      now: clock.now,
    },
    user: {
      config,
      logger,
      db,
      userDao: createUserDao({ db }),
      otpService: createOtpService({ env: process.env }),
    },
  },
};
