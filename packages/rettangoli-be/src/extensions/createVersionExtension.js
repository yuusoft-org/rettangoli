const normalizePath = (value, fallback) => {
  const path = typeof value === 'string' ? value.trim() : '';
  if (!path) return fallback;
  if (!path.startsWith('/')) {
    throw new Error('createVersionExtension: path must start with "/"');
  }
  return path;
};

export const createVersionExtension = ({ path, getBody } = {}) => {
  return {
    name: 'version',
    type: 'http',
    path: normalizePath(path, '/version'),
    methods: ['GET'],
    onRequest: async (requestContext) => {
      const body = typeof getBody === 'function'
        ? await getBody(requestContext)
        : { ok: true };

      return {
        status: 200,
        body,
      };
    },
  };
};

export default createVersionExtension;
