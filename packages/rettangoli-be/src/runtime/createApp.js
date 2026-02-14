import { randomUUID } from 'node:crypto';
import { createMiddlewareChain } from './createMiddlewareChain.js';
import { createSchemaCompiler } from './schema.js';
import {
  JSON_RPC_ERROR_CODES,
  createErrorResponse,
  createJsonRpcError,
  createSuccessResponse,
  validateRequestEnvelope,
} from './jsonRpc.js';
import { resolveSingleFunctionExport } from './resolveExports.js';

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeSetup = (setup) => {
  if (!isPlainObject(setup)) {
    throw new Error('createApp: setup object is required');
  }

  if (!isPlainObject(setup.deps)) {
    throw new Error('createApp: setup.deps object is required');
  }

  return {
    port: setup.port,
    deps: setup.deps,
  };
};

const resolveMiddlewareFactory = ({ middlewareModules, name }) => {
  const moduleObject = middlewareModules[name];
  if (!moduleObject) {
    throw new Error(`createApp: middleware '${name}' module not found`);
  }

  return resolveSingleFunctionExport({
    moduleObject,
    preferredName: name,
    label: `middleware '${name}'`,
  });
};

const buildMiddlewareRegistry = ({ middlewareModules = {}, middlewareDeps = {} }) => {
  const registry = {};

  Object.keys(middlewareModules).forEach((name) => {
    const factory = resolveMiddlewareFactory({ middlewareModules, name });
    const middleware = factory(middlewareDeps[name] ?? {});

    if (typeof middleware !== 'function') {
      throw new Error(`createApp: middleware factory '${name}' must return a middleware function`);
    }

    registry[name] = middleware;
  });

  return registry;
};

const normalizeMiddlewareList = ({ list = [], middlewareByName, label }) => {
  return list.map((entry) => {
    if (typeof entry === 'function') {
      return entry;
    }

    if (typeof entry === 'string') {
      const resolved = middlewareByName[entry];
      if (!resolved) {
        throw new Error(`createApp: ${label} middleware '${entry}' not found`);
      }
      return resolved;
    }

    throw new Error(`createApp: ${label} middleware entries must be function or string`);
  });
};

const createOutputValidationError = ({ method, target, validationErrors }) => {
  const details = validationErrors.join('; ');
  return new Error(`Invalid ${target} output for ${method}: ${details}`);
};

const createDomainJsonRpcError = ({ domainError, domainErrors }) => {
  const mapped = domainErrors[domainError.type] || {};
  const code = typeof mapped.code === 'number'
    ? mapped.code
    : JSON_RPC_ERROR_CODES.DOMAIN_ERROR_DEFAULT;
  const message = typeof mapped.message === 'string' && mapped.message.trim()
    ? mapped.message
    : domainError.type;

  return createJsonRpcError({
    code,
    message,
    data: {
      type: domainError.type,
      details: domainError.details,
    },
  });
};

const withDefaultRequestIdFactory = (createRequestId) => {
  if (typeof createRequestId === 'function') {
    return createRequestId;
  }

  return () => randomUUID();
};

const normalizeMethodMiddlewareNames = ({ method, rpcContract }) => {
  if (!isPlainObject(rpcContract.middleware)) {
    throw new Error(`createApp: contract '${method}' must include middleware.before and middleware.after`);
  }

  const before = rpcContract.middleware.before;
  const after = rpcContract.middleware.after;

  if (!Array.isArray(before) || !Array.isArray(after)) {
    throw new Error(`createApp: contract '${method}' middleware.before and middleware.after must be arrays`);
  }

  return {
    before,
    after,
  };
};

export const createApp = ({
  setup,
  methodContracts = {},
  methodHandlers = {},
  middlewareModules = {},
  globalMiddleware = [],
  middlewareDeps = {},
  domainErrors = {},
  createRequestId,
  includeInternalErrorDetails = false,
} = {}) => {
  const normalizedSetup = normalizeSetup(setup);
  const requestIdFactory = withDefaultRequestIdFactory(createRequestId);
  const schemaCompiler = createSchemaCompiler();

  const normalizedMiddlewareDeps = {
    withRequestId: {
      createId: requestIdFactory,
      ...(middlewareDeps.withRequestId || {}),
    },
    ...middlewareDeps,
  };

  const middlewareByName = buildMiddlewareRegistry({
    middlewareModules,
    middlewareDeps: normalizedMiddlewareDeps,
  });

  const appLevelMiddleware = normalizeMiddlewareList({
    list: globalMiddleware,
    middlewareByName,
    label: 'global',
  });

  const methodRuntime = new Map();

  Object.entries(methodContracts).forEach(([method, rpcContract]) => {
    if (!isPlainObject(rpcContract)) {
      throw new Error(`createApp: contract for '${method}' must be an object`);
    }

    const handlerModule = methodHandlers[method];
    if (!handlerModule) {
      throw new Error(`createApp: handler module for '${method}' is missing`);
    }

    const handler = resolveSingleFunctionExport({
      moduleObject: handlerModule,
      label: `handler '${method}'`,
    });

    const middlewareNames = normalizeMethodMiddlewareNames({ method, rpcContract });
    const before = normalizeMiddlewareList({
      list: middlewareNames.before,
      middlewareByName,
      label: `${method} before`,
    });

    const after = normalizeMiddlewareList({
      list: middlewareNames.after,
      middlewareByName,
      label: `${method} after`,
    });

    const domain = method.split('.')[0];
    const domainDeps = normalizedSetup.deps[domain];
    if (!isPlainObject(domainDeps)) {
      throw new Error(`createApp: missing setup.deps.${domain} object required by method '${method}'`);
    }

    const paramsValidator = schemaCompiler.compile({
      schema: rpcContract.paramsSchema,
      label: `${method} paramsSchema`,
    });

    const successValidator = schemaCompiler.compile({
      schema: rpcContract.outputSchema.success,
      label: `${method} outputSchema.success`,
    });

    const errorValidator = schemaCompiler.compile({
      schema: rpcContract.outputSchema.error,
      label: `${method} outputSchema.error`,
    });

    methodRuntime.set(method, {
      method,
      rpcContract,
      handler,
      domain,
      domainDeps,
      before,
      after,
      validators: {
        params: paramsValidator,
        success: successValidator,
        error: errorValidator,
      },
    });
  });

  const runMethodHandler = async (ctx, runtimeMethod) => {
    const invokeHandler = async (requestContext) => {
      return runtimeMethod.handler({
        payload: requestContext.request.params,
        context: requestContext,
        deps: requestContext.deps,
      });
    };

    const methodBeforeChain = createMiddlewareChain({
      middleware: runtimeMethod.before,
      finalHandler: invokeHandler,
    });

    const handlerResult = await methodBeforeChain(ctx);

    const methodAfterChain = createMiddlewareChain({
      middleware: runtimeMethod.after,
      finalHandler: async () => handlerResult,
    });

    return methodAfterChain(ctx);
  };

  const dispatchWithContext = async ({
    request,
    meta = {},
    cookies = {},
    context = {},
  } = {}) => {
    const envelopeError = validateRequestEnvelope(request);
    if (envelopeError) {
      return {
        response: createErrorResponse({ id: request?.id, error: envelopeError }),
      };
    }

    const runtimeMethod = methodRuntime.get(request.method);
    if (!runtimeMethod) {
      return {
        response: createErrorResponse({
          id: request.id,
          error: createJsonRpcError({
            code: JSON_RPC_ERROR_CODES.METHOD_NOT_FOUND,
            message: 'Method not found',
          }),
        }),
      };
    }

    const params = request.params || {};
    const paramsValid = runtimeMethod.validators.params(params);

    if (!paramsValid) {
      return {
        response: createErrorResponse({
          id: request.id,
          error: createJsonRpcError({
            code: JSON_RPC_ERROR_CODES.INVALID_PARAMS,
            message: 'Invalid params',
            data: {
              validation: schemaCompiler.formatValidationErrors(runtimeMethod.validators.params.errors),
            },
          }),
        }),
      };
    }

    const contextCookies = isPlainObject(cookies) ? cookies : {};
    const requestCookies = isPlainObject(contextCookies.request) ? contextCookies.request : {};
    const responseCookies = Array.isArray(contextCookies.response)
      ? [...contextCookies.response]
      : [];

    const ctx = {
      requestId: context.requestId || requestIdFactory(),
      request: {
        jsonrpc: request.jsonrpc,
        id: request.id,
        method: request.method,
        params,
      },
      meta: isPlainObject(meta) ? meta : {},
      cookies: {
        request: requestCookies,
        response: responseCookies,
      },
      deps: runtimeMethod.domainDeps,
      logger: context.logger,
      authUser: context.authUser,
    };

    const runWithAppMiddleware = createMiddlewareChain({
      middleware: appLevelMiddleware,
      finalHandler: (chainContext) => runMethodHandler(chainContext, runtimeMethod),
    });

    try {
      const handlerOutput = await runWithAppMiddleware(ctx);
      const isDomainError = isPlainObject(handlerOutput) && handlerOutput._error === true;

      if (isDomainError) {
        const errorValid = runtimeMethod.validators.error(handlerOutput);
        if (!errorValid) {
          throw createOutputValidationError({
            method: runtimeMethod.method,
            target: 'error',
            validationErrors: schemaCompiler.formatValidationErrors(runtimeMethod.validators.error.errors),
          });
        }

        return {
          context: ctx,
          response: createErrorResponse({
            id: request.id,
            error: createDomainJsonRpcError({
              domainError: handlerOutput,
              domainErrors,
            }),
          }),
        };
      }

      const successValid = runtimeMethod.validators.success(handlerOutput);
      if (!successValid) {
        throw createOutputValidationError({
          method: runtimeMethod.method,
          target: 'success',
          validationErrors: schemaCompiler.formatValidationErrors(runtimeMethod.validators.success.errors),
        });
      }

      return {
        context: ctx,
        response: createSuccessResponse({
          id: request.id,
          result: handlerOutput,
        }),
      };
    } catch (error) {
      const errorData = {
        requestId: ctx.requestId,
      };

      if (includeInternalErrorDetails) {
        errorData.message = error.message;
      }

      return {
        context: ctx,
        response: createErrorResponse({
          id: request.id,
          error: createJsonRpcError({
            code: JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
            message: 'Internal error',
            data: errorData,
          }),
        }),
      };
    }
  };

  const dispatch = async (input = {}) => {
    const { response } = await dispatchWithContext(input);
    return response;
  };

  return {
    setup: normalizedSetup,
    dispatch,
    dispatchWithContext,
  };
};
