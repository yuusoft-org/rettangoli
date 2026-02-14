# Application Templates (v1 Draft)

These templates show what **application code** should look like.

## src/setup.js

```js
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
```

## src/middleware/withRequestId.js

Middleware convention: mutate `ctx` in place and always call `next(ctx)`.

```js
export const withRequestId = ({ createId }) => (next) => async (ctx) => {
  ctx.requestId = ctx.requestId || createId();
  return next(ctx);
};
```

## src/middleware/withLogger.js

```js
export const withLogger = () => (next) => async (ctx) => {
  ctx.logger = ctx.logger?.child
    ? ctx.logger.child({ requestId: ctx.requestId })
    : ctx.logger;
  return next(ctx);
};
```

## src/middleware/withAuthUser.js

```js
export const withAuthUser = () => (next) => async (ctx) => {
  const token = ctx.cookies?.request?.session;

  if (!token) {
    ctx.authUser = undefined;
    return next(ctx);
  }

  // placeholder verify; real implementation should verify JWT/session
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
```

## src/modules/health/ping/ping.handlers.js

```js
// one method per file
export const healthPingMethod = async ({ payload, context, deps }) => {
  if (!deps?.now) throw new Error('healthPingMethod: deps.now is required');

  return {
    ok: true,
    echo: payload.echo,
    ts: deps.now(),
    requestId: context.requestId,
  };
};
```

## src/modules/health/ping/ping.rpc.yaml

```yaml
method: health.ping
description: Health check ping method.
middleware:
  before: [withRequestId]
  after: [withLogger]
paramsSchema:
  type: object
  additionalProperties: false
  properties:
    echo:
      type: string
  required: []
outputSchema:
  success:
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
    required: [ok, ts, requestId]
  error:
    type: object
    additionalProperties: false
    properties:
      _error:
        const: true
      type:
        type: string
      details:
        type: object
        additionalProperties: true
    required: [_error, type]
```

## src/modules/health/ping/ping.spec.yaml

```yaml
file: './ping.handlers.js'
group: health-ping
---
suite: healthPingMethod
exportName: healthPingMethod
---
case: returns-ok
in:
  - payload: {}
    context:
      requestId: req-1
    deps:
      now: $mock:now
out:
  ok: true
  ts: 1700000000000
  requestId: req-1
mocks:
  now:
    calls:
      - in: []
        out: 1700000000000
---
case: echoes-input
in:
  - payload:
      echo: hello
    context:
      requestId: req-2
    deps:
      now: $mock:now
out:
  ok: true
  echo: hello
  ts: 1700000000001
  requestId: req-2
mocks:
  now:
    calls:
      - in: []
        out: 1700000000001
```

## src/modules/user/getProfile/getProfile.handlers.js

```js
// one method per file
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
```

Runtime maps `{ _error: true, type, details }` to protocol-specific error responses.

## src/modules/user/getProfile/getProfile.rpc.yaml

```yaml
method: user.getProfile
description: Return the authenticated user profile.
middleware:
  before: [withAuthUser]
  after: [withLogger]
paramsSchema:
  type: object
  additionalProperties: false
  properties: {}
  required: []
outputSchema:
  success:
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
  error:
    type: object
    additionalProperties: false
    properties:
      _error:
        const: true
      type:
        type: string
      details:
        type: object
        additionalProperties: true
    required: [_error, type]
```
