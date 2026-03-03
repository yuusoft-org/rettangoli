import { JSON_RPC_ERROR_CODES, createErrorResponse, createJsonRpcError } from '../../runtime/jsonRpc.js';
import { parseCookieHeader, serializeResponseCookies } from './cookies.js';

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const DEFAULT_CORS_ALLOW_METHODS = ['POST', 'OPTIONS'];
const DEFAULT_CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization'];
const DEFAULT_CORS_MAX_AGE_SEC = 86400;

const normalizeHeaders = (headers = {}) => {
  const normalized = {};

  Object.entries(headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      normalized[key] = value.join(', ');
      return;
    }

    if (value === undefined) {
      return;
    }

    normalized[key] = String(value);
  });

  return normalized;
};

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const createTransportError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const readRequestBody = async (request, { maxBodyBytes, requestTimeoutMs }) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let settled = false;

    const cleanup = () => {
      request.off('data', onData);
      request.off('error', onError);
      request.off('aborted', onAborted);
      request.off('end', onEnd);
      clearTimeout(timeoutHandle);
    };

    const finish = (fn, value) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      fn(value);
    };

    const onData = (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBodyBytes) {
        finish(reject, createTransportError('REQUEST_BODY_TOO_LARGE', 'Request body exceeds max size'));
        return;
      }

      chunks.push(chunk);
    };

    const onError = (error) => {
      finish(reject, error);
    };

    const onAborted = () => {
      finish(reject, createTransportError('REQUEST_ABORTED', 'Request aborted by client'));
    };

    const onEnd = () => {
      finish(resolve, Buffer.concat(chunks).toString('utf8'));
    };

    const timeoutHandle = setTimeout(() => {
      finish(reject, createTransportError('REQUEST_TIMEOUT', 'Request body read timed out'));
    }, requestTimeoutMs);

    request.on('data', onData);
    request.on('error', onError);
    request.on('aborted', onAborted);
    request.on('end', onEnd);
  });
};

const writeJson = ({ response, statusCode = 200, payload, cookies = [] }) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');

  if (cookies.length > 0) {
    response.setHeader('Set-Cookie', cookies);
  }

  response.end(JSON.stringify(payload));
};

const appendVaryHeader = (response, value) => {
  const existing = response.getHeader('Vary');
  if (!existing) {
    response.setHeader('Vary', value);
    return;
  }

  const values = new Set(
    String(existing)
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  values.add(value);
  response.setHeader('Vary', Array.from(values).join(', '));
};

const normalizeStringList = ({ value, key, fallback = [], transform = (entry) => entry }) => {
  if (value === undefined) return fallback;
  if (!Array.isArray(value)) {
    throw new Error(`createHttpHandler: ${key} must be an array`);
  }

  return value.map((entry, index) => {
    if (typeof entry !== 'string' || !entry.trim()) {
      throw new Error(`createHttpHandler: ${key}[${index}] must be a non-empty string`);
    }

    return transform(entry.trim());
  });
};

const normalizeCors = (cors) => {
  if (cors === undefined || cors === null) return undefined;
  if (!isPlainObject(cors)) {
    throw new Error('createHttpHandler: cors must be an object when provided');
  }

  const allowedOrigins = normalizeStringList({
    value: cors.allowedOrigins,
    key: 'cors.allowedOrigins',
  });
  if (allowedOrigins.length === 0) {
    throw new Error('createHttpHandler: cors.allowedOrigins must be a non-empty array');
  }

  const allowCredentials = typeof cors.allowCredentials === 'boolean'
    ? cors.allowCredentials
    : false;

  const allowMethods = normalizeStringList({
    value: cors.allowMethods,
    key: 'cors.allowMethods',
    fallback: DEFAULT_CORS_ALLOW_METHODS,
    transform: (entry) => entry.toUpperCase(),
  });

  const allowHeaders = normalizeStringList({
    value: cors.allowHeaders,
    key: 'cors.allowHeaders',
    fallback: DEFAULT_CORS_ALLOW_HEADERS,
  });

  const exposeHeaders = normalizeStringList({
    value: cors.exposeHeaders,
    key: 'cors.exposeHeaders',
    fallback: [],
  });

  const maxAgeSec = cors.maxAgeSec === undefined
    ? DEFAULT_CORS_MAX_AGE_SEC
    : Number(cors.maxAgeSec);
  if (!Number.isInteger(maxAgeSec) || maxAgeSec < 0) {
    throw new Error('createHttpHandler: cors.maxAgeSec must be an integer >= 0');
  }

  return {
    allowedOrigins,
    allowCredentials,
    allowMethods,
    allowHeaders,
    exposeHeaders,
    maxAgeSec,
  };
};

const resolveAllowedOrigin = ({ origin, cors }) => {
  if (!origin) return undefined;
  if (cors.allowedOrigins.includes('*')) {
    return cors.allowCredentials ? origin : '*';
  }
  if (cors.allowedOrigins.includes(origin)) {
    return origin;
  }
  return undefined;
};

const applyCorsHeaders = ({ request, response, cors }) => {
  if (!cors) {
    return {
      allowed: true,
      hasOrigin: false,
    };
  }

  const origin = typeof request.headers.origin === 'string'
    ? request.headers.origin.trim()
    : '';
  if (!origin) {
    return {
      allowed: true,
      hasOrigin: false,
    };
  }

  const allowedOrigin = resolveAllowedOrigin({ origin, cors });
  if (!allowedOrigin) {
    appendVaryHeader(response, 'Origin');
    return {
      allowed: false,
      hasOrigin: true,
    };
  }

  response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  response.setHeader('Access-Control-Allow-Methods', cors.allowMethods.join(', '));
  response.setHeader('Access-Control-Allow-Headers', cors.allowHeaders.join(', '));
  response.setHeader('Access-Control-Max-Age', String(cors.maxAgeSec));

  if (cors.exposeHeaders.length > 0) {
    response.setHeader('Access-Control-Expose-Headers', cors.exposeHeaders.join(', '));
  }

  if (cors.allowCredentials) {
    response.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (allowedOrigin !== '*') {
    appendVaryHeader(response, 'Origin');
  }
  appendVaryHeader(response, 'Access-Control-Request-Method');
  appendVaryHeader(response, 'Access-Control-Request-Headers');

  return {
    allowed: true,
    hasOrigin: true,
  };
};

const createInvalidRequestPayload = ({ id = null, reason, data = {} }) => {
  return createErrorResponse({
    id,
    error: createJsonRpcError({
      code: JSON_RPC_ERROR_CODES.INVALID_REQUEST,
      message: 'Invalid Request',
      data: {
        reason,
        ...data,
      },
    }),
  });
};

export const createHttpHandler = ({
  app,
  getMeta,
  cors,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
} = {}) => {
  if (!app?.dispatchWithContext) {
    throw new Error('createHttpHandler: app.dispatchWithContext is required');
  }

  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes <= 0) {
    throw new Error('createHttpHandler: maxBodyBytes must be a positive integer');
  }

  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new Error('createHttpHandler: requestTimeoutMs must be a positive integer');
  }

  const normalizedCors = normalizeCors(cors);

  return async (request, response) => {
    const corsResult = applyCorsHeaders({
      request,
      response,
      cors: normalizedCors,
    });
    const method = String(request.method || '').toUpperCase();

    if (!corsResult.allowed && corsResult.hasOrigin) {
      writeJson({
        response,
        statusCode: 403,
        payload: createInvalidRequestPayload({
          reason: 'cors_origin_not_allowed',
        }),
      });
      return;
    }

    if (method === 'OPTIONS' && normalizedCors) {
      response.statusCode = 204;
      response.end();
      return;
    }

    if (method !== 'POST') {
      writeJson({
        response,
        statusCode: 405,
        payload: createInvalidRequestPayload({
          reason: 'http_method_must_be_post',
        }),
      });
      return;
    }

    let payloadText;
    try {
      payloadText = await readRequestBody(request, {
        maxBodyBytes,
        requestTimeoutMs,
      });
    } catch (error) {
      if (error?.code === 'REQUEST_BODY_TOO_LARGE') {
        writeJson({
          response,
          statusCode: 413,
          payload: createInvalidRequestPayload({
            reason: 'request_body_too_large',
            data: { maxBodyBytes },
          }),
        });
        return;
      }

      if (error?.code === 'REQUEST_TIMEOUT') {
        writeJson({
          response,
          statusCode: 408,
          payload: createInvalidRequestPayload({
            reason: 'request_timeout',
            data: { requestTimeoutMs },
          }),
        });
        return;
      }

      if (error?.code === 'REQUEST_ABORTED') {
        writeJson({
          response,
          statusCode: 400,
          payload: createInvalidRequestPayload({
            reason: 'request_aborted',
          }),
        });
        return;
      }

      writeJson({
        response,
        statusCode: 400,
        payload: createErrorResponse({
          id: null,
          error: createJsonRpcError({
            code: JSON_RPC_ERROR_CODES.PARSE_ERROR,
            message: 'Parse error',
          }),
        }),
      });
      return;
    }

    let payload;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      writeJson({
        response,
        statusCode: 200,
        payload: createErrorResponse({
          id: null,
          error: createJsonRpcError({
            code: JSON_RPC_ERROR_CODES.PARSE_ERROR,
            message: 'Parse error',
          }),
        }),
      });
      return;
    }

    const requestCookies = parseCookieHeader(request.headers.cookie);
    const defaultMeta = {
      ip: request.socket?.remoteAddress,
      userAgent: request.headers['user-agent'],
      headers: normalizeHeaders(request.headers),
    };

    const runtimeMeta = typeof getMeta === 'function'
      ? getMeta({ request, defaultMeta })
      : defaultMeta;

    let dispatchOutput;
    try {
      dispatchOutput = await app.dispatchWithContext({
        request: payload,
        meta: runtimeMeta,
        cookies: {
          request: requestCookies,
          response: [],
        },
      });
    } catch {
      writeJson({
        response,
        statusCode: 200,
        payload: createErrorResponse({
          id: payload?.id,
          error: createJsonRpcError({
            code: JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
            message: 'Internal error',
          }),
        }),
      });
      return;
    }

    const { response: rpcResponse, context } = dispatchOutput;
    const setCookie = serializeResponseCookies(context?.cookies?.response || []);

    writeJson({
      response,
      statusCode: 200,
      payload: rpcResponse,
      cookies: setCookie,
    });
  };
};
