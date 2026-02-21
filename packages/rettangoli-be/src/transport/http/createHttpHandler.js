import { JSON_RPC_ERROR_CODES, createErrorResponse, createJsonRpcError } from '../../runtime/jsonRpc.js';
import { parseCookieHeader, serializeResponseCookies } from './cookies.js';

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

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

  return async (request, response) => {
    if (request.method !== 'POST') {
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
