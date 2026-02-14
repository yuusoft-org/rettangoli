import { JSON_RPC_ERROR_CODES, createErrorResponse, createJsonRpcError } from '../../runtime/jsonRpc.js';
import { parseCookieHeader, serializeResponseCookies } from './cookies.js';

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

const readRequestBody = async (request) => {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on('data', (chunk) => chunks.push(chunk));
    request.on('error', (error) => reject(error));
    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
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

export const createHttpHandler = ({ app, getMeta } = {}) => {
  if (!app?.dispatchWithContext) {
    throw new Error('createHttpHandler: app.dispatchWithContext is required');
  }

  return async (request, response) => {
    if (request.method !== 'POST') {
      writeJson({
        response,
        statusCode: 405,
        payload: createErrorResponse({
          id: null,
          error: createJsonRpcError({
            code: JSON_RPC_ERROR_CODES.INVALID_REQUEST,
            message: 'Invalid Request',
            data: { reason: 'HTTP method must be POST' },
          }),
        }),
      });
      return;
    }

    let payloadText;
    try {
      payloadText = await readRequestBody(request);
    } catch {
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

    const { response: rpcResponse, context } = await app.dispatchWithContext({
      request: payload,
      meta: runtimeMeta,
      cookies: {
        request: requestCookies,
        response: [],
      },
    });

    const setCookie = serializeResponseCookies(context?.cookies?.response || []);

    writeJson({
      response,
      statusCode: 200,
      payload: rpcResponse,
      cookies: setCookie,
    });
  };
};
