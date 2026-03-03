import { createServerFromProject } from '../runtime/createServerFromProject.js';

const normalizePort = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }

  return parsed;
};

const formatAddress = ({ host, port }) => {
  return `http://${host}:${port}`;
};

const startRettangoliBackend = async (options = {}) => {
  const {
    cwd = process.cwd(),
    host,
    port,
    configPath = 'rettangoli.config.yaml',
  } = options;

  const runtime = await createServerFromProject({
    cwd,
    configPath,
  });

  const listenHost = typeof host === 'string' && host.trim()
    ? host.trim()
    : runtime.config.host;
  const listenPort = normalizePort(port) ?? runtime.config.port;

  await runtime.listen({
    host: listenHost,
    port: listenPort,
  });

  const address = runtime.server.address();
  const resolvedPort = typeof address === 'object' && address !== null
    ? address.port
    : listenPort;

  console.log(`[Start] Backend server listening on ${formatAddress({ host: listenHost, port: resolvedPort })}`);

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[Start] Received ${signal}; shutting down`);

    try {
      await runtime.close();
      console.log('[Start] Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error(`[Start] Shutdown failed: ${error?.message || 'unknown'}`);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });

  return runtime;
};

export default startRettangoliBackend;
