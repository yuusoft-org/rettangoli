const normalizePath = (value, fallback) => {
  const path = typeof value === 'string' ? value.trim() : '';
  if (!path) return fallback;
  if (!path.startsWith('/')) {
    throw new Error('createHealthExtension: path must start with "/"');
  }
  return path;
};

export const createHealthExtension = ({ path } = {}) => {
  return {
    name: 'healthz',
    type: 'http',
    path: normalizePath(path, '/healthz'),
    methods: ['GET'],
    onRequest: async () => {
      return {
        status: 200,
        body: { status: 'ok' },
      };
    },
  };
};

export default createHealthExtension;
