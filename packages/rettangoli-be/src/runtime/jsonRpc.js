export const JSON_RPC_ERROR_CODES = Object.freeze({
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  DOMAIN_ERROR_DEFAULT: -32000,
});

const isPlainObject = (value) => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

export const createJsonRpcError = ({ code, message, data }) => {
  const error = {
    code,
    message,
  };

  if (data !== undefined) {
    error.data = data;
  }

  return error;
};

export const createSuccessResponse = ({ id, result }) => {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
};

export const createErrorResponse = ({ id, error }) => {
  return {
    jsonrpc: '2.0',
    id: id === undefined ? null : id,
    error,
  };
};

export const validateRequestEnvelope = (request) => {
  if (!isPlainObject(request)) {
    return createJsonRpcError({
      code: JSON_RPC_ERROR_CODES.INVALID_REQUEST,
      message: 'Invalid Request',
      data: { reason: 'request must be an object' },
    });
  }

  if (request.jsonrpc !== '2.0') {
    return createJsonRpcError({
      code: JSON_RPC_ERROR_CODES.INVALID_REQUEST,
      message: 'Invalid Request',
      data: { reason: 'jsonrpc must be "2.0"' },
    });
  }

  if (typeof request.method !== 'string' || !request.method.trim()) {
    return createJsonRpcError({
      code: JSON_RPC_ERROR_CODES.INVALID_REQUEST,
      message: 'Invalid Request',
      data: { reason: 'method must be a non-empty string' },
    });
  }

  if (typeof request.id !== 'string' && typeof request.id !== 'number') {
    return createJsonRpcError({
      code: JSON_RPC_ERROR_CODES.INVALID_REQUEST,
      message: 'Invalid Request',
      data: { reason: 'id must be a string or number' },
    });
  }

  if (request.params !== undefined) {
    if (!isPlainObject(request.params)) {
      return createJsonRpcError({
        code: JSON_RPC_ERROR_CODES.INVALID_REQUEST,
        message: 'Invalid Request',
        data: { reason: 'params must be an object when provided' },
      });
    }
  }

  return undefined;
};
