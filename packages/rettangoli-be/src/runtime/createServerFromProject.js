import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHealthExtension } from '../extensions/createHealthExtension.js';
import { createReadyExtension } from '../extensions/createReadyExtension.js';
import { createVersionExtension } from '../extensions/createVersionExtension.js';
import { createAppFromProject } from './createAppFromProject.js';
import { loadBeProjectConfig } from './loadBeProjectConfig.js';
import { createHttpHandler } from '../transport/http/createHttpHandler.js';
import { parseCookieHeader, serializeResponseCookies } from '../transport/http/cookies.js';

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const importModuleFromPath = async (filePath) => {
  const fileUrl = pathToFileURL(filePath).href;
  return import(fileUrl);
};

const loadSetup = async (setupPath) => {
  const setupModule = await importModuleFromPath(setupPath);

  if (setupModule.setup) {
    return setupModule.setup;
  }

  if (setupModule.default) {
    return setupModule.default;
  }

  throw new Error(`createServerFromProject: setup export not found in ${setupPath}`);
};

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

const createRequestMeta = (request) => ({
  ip: request.socket?.remoteAddress,
  userAgent: request.headers['user-agent'],
  headers: normalizeHeaders(request.headers),
});

const writeJson = ({ response, statusCode = 200, body, cookies = [] }) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');

  if (cookies.length > 0) {
    response.setHeader('Set-Cookie', cookies);
  }

  response.end(JSON.stringify(body));
};

const writeNotFound = (response) => {
  writeJson({
    response,
    statusCode: 404,
    body: {
      ok: false,
      error: 'not_found',
    },
  });
};

const writeExtensionResult = ({ response, result }) => {
  if (response.writableEnded) return;
  if (result === undefined) {
    response.statusCode = 204;
    response.end();
    return;
  }

  if (!isPlainObject(result)) {
    writeJson({
      response,
      statusCode: 200,
      body: result,
    });
    return;
  }

  const status = Number.isInteger(result.status) ? result.status : 200;
  const headers = isPlainObject(result.headers) ? result.headers : {};
  const cookies = Array.isArray(result.cookies) ? result.cookies : [];
  const payload = Object.prototype.hasOwnProperty.call(result, 'body')
    ? result.body
    : result;

  Object.entries(headers).forEach(([name, value]) => {
    response.setHeader(name, value);
  });

  writeJson({
    response,
    statusCode: status,
    body: payload,
    cookies: serializeResponseCookies(cookies),
  });
};

const normalizeMethods = (value) => {
  if (value === undefined) return ['GET'];
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('createServerFromProject: extension.methods must be a non-empty array when provided');
  }

  return value.map((entry) => {
    if (typeof entry !== 'string' || !entry.trim()) {
      throw new Error('createServerFromProject: extension.methods entries must be non-empty strings');
    }

    return entry.trim().toUpperCase();
  });
};

const normalizeExtension = (extension, index) => {
  if (!isPlainObject(extension)) {
    throw new Error(`createServerFromProject: extension[${index}] must be an object`);
  }

  const type = typeof extension.type === 'string'
    ? extension.type.trim().toLowerCase()
    : '';
  if (type !== 'http' && type !== 'ws') {
    throw new Error(`createServerFromProject: extension[${index}] type must be "http" or "ws"`);
  }

  const rawPath = typeof extension.path === 'string' ? extension.path.trim() : '';
  if (!rawPath || !rawPath.startsWith('/')) {
    throw new Error(`createServerFromProject: extension[${index}] path must be an absolute path`);
  }

  if (type === 'ws' && extension.methods !== undefined) {
    throw new Error(`createServerFromProject: extension[${index}] methods is only supported for http extensions`);
  }

  return {
    name: typeof extension.name === 'string' && extension.name.trim()
      ? extension.name.trim()
      : `${type}:${rawPath}`,
    type,
    path: rawPath,
    methods: type === 'http' ? normalizeMethods(extension.methods) : [],
    setup: typeof extension.setup === 'function' ? extension.setup : undefined,
    onRequest: typeof extension.onRequest === 'function' ? extension.onRequest : undefined,
    onUpgrade: typeof extension.onUpgrade === 'function' ? extension.onUpgrade : undefined,
    onShutdown: typeof extension.onShutdown === 'function' ? extension.onShutdown : undefined,
  };
};

const resolveExtensions = (setupExtensions) => {
  if (setupExtensions === undefined) {
    return [
      createHealthExtension(),
      createReadyExtension(),
      createVersionExtension(),
    ];
  }

  if (!Array.isArray(setupExtensions)) {
    throw new Error('createServerFromProject: setup.extensions must be an array');
  }

  return setupExtensions;
};

const assertNoPathConflicts = ({ rpcPath, extensions }) => {
  const seen = new Set([rpcPath]);

  extensions.forEach((extension) => {
    if (seen.has(extension.path)) {
      throw new Error(`createServerFromProject: extension path conflict at '${extension.path}'`);
    }

    seen.add(extension.path);
  });
};

export const createServerFromProject = async ({
  cwd = process.cwd(),
  configPath = 'rettangoli.config.yaml',
} = {}) => {
  const beConfig = loadBeProjectConfig({ cwd, configPath });
  const app = await createAppFromProject({
    cwd,
    methodDirs: ['./src/modules'],
    middlewareDirs: ['./src/middleware'],
    setupPath: './src/setup.js',
    globalMiddlewareBefore: beConfig.globalMiddleware.before,
    globalMiddlewareAfter: beConfig.globalMiddleware.after,
  });

  const setupPath = path.resolve(cwd, './src/setup.js');
  const setup = await loadSetup(setupPath);
  if (!isPlainObject(setup) || !isPlainObject(setup.deps)) {
    throw new Error('createServerFromProject: setup.deps is required');
  }

  const extensions = resolveExtensions(setup.extensions)
    .map((entry, index) => normalizeExtension(entry, index));
  assertNoPathConflicts({
    rpcPath: beConfig.rpcPath,
    extensions,
  });

  const rpcHandler = createHttpHandler({
    app,
    cors: beConfig.cors,
  });
  const httpExtensions = extensions.filter((entry) => entry.type === 'http');
  const wsExtensions = extensions.filter((entry) => entry.type === 'ws');

  const extensionBaseContext = {
    config: beConfig,
    deps: setup.deps,
  };

  for (const extension of extensions) {
    if (typeof extension.setup !== 'function') continue;
    await extension.setup(extensionBaseContext);
  }

  const server = createHttpServer(async (request, response) => {
    const host = request.headers.host || 'localhost';
    const url = new URL(request.url || '/', `http://${host}`);

    if (url.pathname === beConfig.rpcPath) {
      await rpcHandler(request, response);
      return;
    }

    const extension = httpExtensions.find((entry) => entry.path === url.pathname);
    if (!extension || !extension.onRequest) {
      writeNotFound(response);
      return;
    }

    if (!extension.methods.includes(String(request.method || '').toUpperCase())) {
      response.statusCode = 405;
      response.end();
      return;
    }

    try {
      const result = await extension.onRequest({
        req: request,
        res: response,
        meta: createRequestMeta(request),
        cookies: {
          request: parseCookieHeader(request.headers.cookie),
          response: [],
        },
        deps: setup.deps,
      });
      writeExtensionResult({ response, result });
    } catch (error) {
      writeJson({
        response,
        statusCode: 500,
        body: {
          ok: false,
          error: 'extension_error',
          detail: error?.message || 'unknown',
        },
      });
    }
  });

  server.on('upgrade', async (request, socket, head) => {
    const host = request.headers.host || 'localhost';
    const url = new URL(request.url || '/', `http://${host}`);

    const extension = wsExtensions.find((entry) => entry.path === url.pathname);
    if (!extension || !extension.onUpgrade) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      await extension.onUpgrade({
        request,
        socket,
        head,
        meta: createRequestMeta(request),
        deps: setup.deps,
      });
    } catch {
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  });

  return {
    app,
    config: beConfig,
    server,
    listen: async ({ host = beConfig.host, port = beConfig.port } = {}) => {
      await new Promise((resolveListen, rejectListen) => {
        const onError = (error) => {
          server.off('listening', onListening);
          rejectListen(error);
        };
        const onListening = () => {
          server.off('error', onError);
          resolveListen();
        };

        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, host);
      });
    },
    close: async () => {
      for (const extension of extensions) {
        if (typeof extension.onShutdown !== 'function') continue;
        await extension.onShutdown(extensionBaseContext);
      }

      await new Promise((resolveClose) => server.close(resolveClose));
    },
  };
};

export default createServerFromProject;
