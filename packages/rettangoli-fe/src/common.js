const getQueryParamsObject = () => {
  const queryParams = new URLSearchParams(window.location.search + "");
  const paramsObject = {};

  for (const [key, value] of queryParams.entries()) {
    paramsObject[key] = value;
  }

  return paramsObject;
};

class LayoutOptions {
  constructor(params) {
    this._isTouchLayout = params?.isTouchLayout || false;
  }

  get isTouchLayout() {
    return this._isTouchLayout;
  }

  setIsTouchLayout = (isTouchLayout) => {
    this._isTouchLayout = isTouchLayout;
  };
}

const matchPaths = (path, pattern) => {
  // Normalize paths by removing trailing slashes
  const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;
  const normalizedPattern = pattern.endsWith("/") ? pattern.slice(0, -1) : pattern;

  // Convert pattern segments with parameters like [id] to regex patterns
  const regexPattern = normalizedPattern
    .split("/")
    .map((segment) => {
      // Check if segment is a parameter (enclosed in square brackets)
      if (segment.startsWith("[") && segment.endsWith("]")) {
        // Extract parameter name and create a capturing group
        return "([^/]+)";
      }
      // Regular segment, match exactly
      return segment;
    })
    .join("/");

  // Create regex with start and end anchors
  const regex = new RegExp(`^${regexPattern}$`);

  // Test if path matches the pattern
  return regex.test(normalizedPath);
};


class Request {
  _authToken;

  constructor(baseUrl, authToken, headers) {
    this._baseUrl = baseUrl;
    this._authToken = authToken;
    this._headers = headers;
  }

  setAuthToken(token) {
    this._authToken = token;
  }

  async request(name, payload, options) {
    const headers = {
      "Content-Type": "application/json",
      ...this._headers,
    };
    if (this._authToken) {
      headers.Authorization = `Bearer ${this._authToken}`;
    }

    const response = await fetch(`${this._baseUrl}/${name}`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers,
      credentials: options?.includeCredentials ? "include" : undefined,
    });

    return response.json();
  }
}

/**
 * @typedef {Object} ApiEndpointConfig
 * @property {boolean} [includeCredentials] - Whether to include credentials in the request
 */

/**
 * Creates an HTTP client with a flexible JSON configuration.
 * The generated client provides typed methods for each API endpoint based on the configuration.
 *
 * @param {Object} config - The client configuration
 * @param {string} config.baseUrl - Base URL for all API requests
 * @param {Object} [config.headers={}] - Default headers for all requests
 * @param {Object.<string, Object.<string, ApiEndpointConfig>>} [config.apis={}] - API configuration object
 * @returns {Object} The configured HTTP client with API methods
 */
export function createHttpClient(config) {
  const { baseUrl, apis = {}, headers = {} } = config;
  const requests = new Map();

  const httpClient = {};

  // Create request instances and client structure from configuration
  Object.entries(apis).forEach(([apiName, endpoints]) => {
    const apiBaseUrl = `${baseUrl}/${apiName}`;
    const request = new Request(apiBaseUrl, undefined, headers);
    requests.set(apiName, request);

    // Create API namespace on the client
    httpClient[apiName] = {};

    // Create methods for each endpoint
    Object.entries(endpoints).forEach(([endpointName, options]) => {
      httpClient[apiName][endpointName] = (body) => {
        return request.request(endpointName, body, options);
      };
    });
  });

  // Add setAuthToken method to the client
  httpClient.setAuthToken = (token) => {
    for (const request of requests.values()) {
      request.setAuthToken(token);
    }
  };

  return httpClient;
}

export { flattenArrays } from "./utils/flattenArrays.js";
