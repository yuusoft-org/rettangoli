# Application Templates (v1 Draft)

These templates show what **application code** should look like.

## src/index.js

```js
export { setup, port } from './setup.js';
```

## src/setup.js

```js
import { createDeps } from './deps/index.js';
import { registerHealthModule } from './modules/health/module.js';
import { registerUserModule } from './modules/user/module.js';
import { withRequestId } from './middleware/withRequestId.js';
import { withLogger } from './middleware/withLogger.js';
import { withAuthUser } from './middleware/withAuthUser.js';

// Placeholder public API from framework package
import { createRuntime } from '@rettangoli/be';

export const port = Number(process.env.PORT || 3000);

export const setup = ({ deps: depsOverride } = {}) => {
  const deps = depsOverride || createDeps({ env: process.env });

  const modules = [
    registerHealthModule({ deps }),
    registerUserModule({ deps }),
  ];

  const methods = {};
  const contracts = {};

  for (const m of modules) {
    for (const [method, handler] of Object.entries(m.methods)) {
      if (methods[method]) throw new Error(`setup: duplicate method ${method}`);
      methods[method] = handler;
    }

    for (const [method, contract] of Object.entries(m.contracts)) {
      if (contracts[method]) throw new Error(`setup: duplicate contract ${method}`);
      contracts[method] = contract;
    }
  }

  return createRuntime({
    deps,
    methods,
    contracts,
    middleware: [
      withRequestId({
        createId: () => `req-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }),
      withLogger(),
      withAuthUser(),
    ],
  });
};
```

## src/middleware/withRequestId.js

```js
export const withRequestId = ({ createId }) => (next) => async (ctx) => {
  const requestId = ctx.requestId || createId();
  return next({ ...ctx, requestId });
};
```

## src/middleware/withLogger.js

```js
export const withLogger = () => (next) => async (ctx) => {
  const logger = ctx.logger?.child
    ? ctx.logger.child({ requestId: ctx.requestId })
    : ctx.logger;
  return next({ ...ctx, logger });
};
```

## src/middleware/withAuthUser.js

```js
export const withAuthUser = () => (next) => async (ctx) => {
  const token = ctx.meta?.headers?.authorization;

  if (!token) {
    return next({ ...ctx, authUser: undefined });
  }

  // placeholder verify; real implementation should verify JWT/session
  const authUser = { userId: 'u-1', scopes: ['user'] };
  return next({ ...ctx, authUser });
};
```

## src/deps/index.js

```js
import { createConfig } from './createConfig.js';
import { createLogger } from './createLogger.js';
import { createClock } from './createClock.js';
import { createDb } from './createDb.js';
import { createUserDao } from './createUserDao.js';
import { createOtpService } from './createOtpService.js';

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
```

## src/deps/createUserDao.js

```js
export const createUserDao = ({ db }) => {
  if (!db) throw new Error('createUserDao: db is required');

  return {
    findById: async ({ userId }) => {
      return db.user.findById(userId);
    },
  };
};
```

## src/deps/createOtpService.js

```js
export const createOtpService = ({ env }) => {
  if (!env?.OTP_SECRET) throw new Error('createOtpService: env.OTP_SECRET is required');

  return {
    generate: ({ identifier }) => `${identifier}-${Date.now()}`,
  };
};
```

## src/modules/health/module.js

```js
import healthPingSchema from './ping/ping.schema.yaml';
import { createHealthPingMethod } from './ping/ping.handlers.js';

export const registerHealthModule = ({ deps }) => {
  if (!deps?.clock?.now) throw new Error('registerHealthModule: deps.clock.now is required');

  return {
    name: 'health',
    methods: {
      ...createHealthPingMethod({ now: deps.clock.now }),
    },
    contracts: {
      'health.ping': {
        paramsSchema: healthPingSchema.paramsSchema,
        resultSchema: healthPingSchema.resultSchema,
      },
    },
  };
};
```

## src/modules/health/ping/ping.handlers.js

```js
// one method per file
export const createHealthPingMethod = ({ now }) => {
  if (!now) throw new Error('createHealthPingMethod: now is required');

  return {
    'health.ping': async ({ params, context, deps }) => {
      // example: handlers consume deps but keep business rules here
      const user = await deps.userDao.findById({ userId: 'health-user' });

      return {
        ok: true,
        echo: params.echo,
        ts: now(),
        requestId: context.requestId,
        userFound: Boolean(user),
      };
    },
  };
};
```

## src/modules/health/ping/ping.schema.yaml

```yaml
method: health.ping
paramsSchema:
  type: object
  additionalProperties: false
  properties:
    echo:
      type: string
  required: []
resultSchema:
  type: object
  additionalProperties: false
  properties:
    ok:
      type: boolean
    echo:
      type: string
    ts:
      type: number
    requestId:
      type: string
    userFound:
      type: boolean
  required: [ok, ts, requestId, userFound]
```

## src/modules/user/module.js

```js
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
```

## src/modules/user/getProfile/getProfile.handlers.js

```js
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

// one method per file
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
```

## src/modules/user/getProfile/getProfile.schema.yaml

```yaml
method: user.getProfile
paramsSchema:
  type: object
  additionalProperties: false
  properties: {}
  required: []
resultSchema:
  type: object
  additionalProperties: false
  properties:
    id:
      type: string
    email:
      type: string
    role:
      type: string
  required: [id, email, role]
```
