import fs, { watch, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { buildSite } from './build.js';
import { loadSiteConfig } from '../utils/loadSiteConfig.js';
import { createWatchClientScript } from './watchClient.js';

const RELOAD_MODES = new Set(['body', 'full']);
const LIVE_ASSET_PATTERN = /\.css$/i;

function normalizePort(port) {
  const normalizedPort = Number(port);
  if (!Number.isInteger(normalizedPort) || normalizedPort < 1 || normalizedPort > 65535) {
    throw new Error(`Invalid port "${port}". Allowed values: integers from 1 to 65535.`);
  }
  return normalizedPort;
}

export function createClientScript(
  reloadMode = 'body',
  initialRevision = 0,
  initialSessionId = null,
) {
  return createWatchClientScript(reloadMode, initialRevision, initialSessionId);
}

export function classifyWatchChanges(changes = []) {
  const normalizedChanges = Array.from(changes);
  if (normalizedChanges.length === 0) return { updateKind: 'html', paths: [] };

  const hasScriptChange = normalizedChanges.some((change) =>
    /\.(?:[cm]?js|wasm)$/i.test(change.relativePath || ''),
  );
  if (hasScriptChange) return { updateKind: 'full', paths: [] };

  const hasUnsupportedStaticAssetChange = normalizedChanges.some((change) => {
    if (change.scope !== 'static') return false;
    const relativePath = change.relativePath || '';
    return change.removed === true ||
      (
        !/\.html?$/i.test(relativePath) &&
        !LIVE_ASSET_PATTERN.test(relativePath)
      );
  });
  if (hasUnsupportedStaticAssetChange) {
    return { updateKind: 'full', paths: [] };
  }

  const hasHtmlSourceChange = normalizedChanges.some((change) => {
    if (change.scope !== 'static') return true;
    return /\.html?$/i.test(change.relativePath || '');
  });

  const assetPaths = [...new Set(normalizedChanges
    .filter((change) =>
      change.scope === 'static' &&
      LIVE_ASSET_PATTERN.test(change.relativePath || ''),
    )
    .map((change) => change.publicPath)
    .filter(Boolean))].sort();

  if (hasHtmlSourceChange) return { updateKind: 'html', paths: assetPaths };

  return {
    updateKind: 'assets',
    paths: assetPaths,
  };
}

export function finalizeWatchChanges(changes = []) {
  return Array.from(changes, (change) =>
    change.scope === 'static' && change.sourcePath
      ? {
          ...change,
          removed: !existsSync(change.sourcePath),
        }
      : change,
  );
}

export function getContentType(ext) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.cjs': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.wasm': 'application/wasm',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.avif': 'image/avif',
    '.bmp': 'image/bmp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.otf': 'font/otf',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };
  return types[ext] || 'application/octet-stream';
}

export function getWatchResponseHeaders(ext) {
  const headers = {
    'Cache-Control': 'no-store',
    'Content-Type': getContentType(ext),
  };
  if (ext === '.md' || ext === '.txt') {
    headers['Content-Disposition'] = 'inline';
  }
  return headers;
}

function createLogger(quiet = false) {
  return {
    log: (...args) => {
      if (!quiet) {
        console.log(...args);
      }
    },
    error: (...args) => {
      console.error(...args);
    }
  };
}

class DevServer {
  constructor(
    port = 3001,
    siteDir = '_site',
    logger = createLogger(false),
    reloadMode = 'body',
    sessionId = randomUUID(),
  ) {
    this.port = port;
    this.clients = new Set();
    this.siteDir = siteDir;
    this.logger = logger;
    this.reloadMode = reloadMode;
    this.sessionId = sessionId;
    this.revision = 0;
    this.fullReloadRevision = 0;
  }

  start() {
    // Create HTTP server
    this.httpServer = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);

      ws.send(JSON.stringify({
        type: 'watch-state',
        sessionId: this.sessionId,
        revision: this.revision,
        fullReloadRevision: this.fullReloadRevision,
      }));

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        this.logger.error('WebSocket error:', err);
        this.clients.delete(ws);
      });
    });

    // Start listening
    this.httpServer.listen(this.port, '0.0.0.0', () => {
      this.logger.log(`Dev server: http://localhost:${this.port}/`);
    });
  }

  handleRequest(req, res) {
    const urlParts = req.url.split('?');
    let urlPath = urlParts[0];

    // Default to index.html for root
    if (urlPath === '/') {
      urlPath = '/index.html';
    }

    // Handle trailing slash - remove it for processing
    const hasTrailingSlash = urlPath.endsWith('/') && urlPath !== '/';
    if (hasTrailingSlash) {
      urlPath = urlPath.slice(0, -1);
    }

    // Handle paths without extensions
    if (!path.extname(urlPath)) {
      // First try as .html file
      const htmlPath = path.join(this.siteDir, urlPath + '.html');
      if (existsSync(htmlPath)) {
        urlPath = urlPath + '.html';
      } else {
        // Try as directory with index.html
        const indexPath = path.join(this.siteDir, urlPath, 'index.html');
        if (existsSync(indexPath)) {
          urlPath = path.join(urlPath, 'index.html');
        }
      }
    }

    const filePath = path.join(this.siteDir, urlPath);

    // Check if file exists
    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end('404 Not Found');
      return;
    }

    // Check if it's a directory
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      // Try to serve index.html from the directory
      const indexPath = path.join(filePath, 'index.html');
      if (existsSync(indexPath)) {
        return this.serveFile(indexPath, res);
      } else {
        res.writeHead(404);
        res.end('404 Not Found');
        return;
      }
    }

    // Serve the file
    this.serveFile(filePath, res);
  }

  serveFile(filePath, res) {
    const ext = path.extname(filePath);

    try {
      let content = fs.readFileSync(filePath);

      // Inject client script into HTML files
      if (ext === '.html') {
        content = content.toString();
        const clientScript = createClientScript(
          this.reloadMode,
          this.revision,
          this.sessionId,
        );
        // Inject before </body> or </html> or at the end
        if (content.includes('</body>')) {
          content = content.replace('</body>', clientScript + '</body>');
        } else if (content.includes('</html>')) {
          content = content.replace('</html>', clientScript + '</html>');
        } else {
          content = content + clientScript;
        }
      }

      const headers = getWatchResponseHeaders(ext);
      res.writeHead(200, headers);
      res.end(content);
    } catch (err) {
      this.logger.error('Error serving file:', err);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }

  reloadAll({ updateKind = 'html', paths = [] } = {}) {
    this.revision += 1;
    if (updateKind === 'full') this.fullReloadRevision = this.revision;

    const message = JSON.stringify({
      type: 'reload-current',
      sessionId: this.sessionId,
      updateKind,
      paths,
      revision: this.revision,
    });

    let sentCount = 0;
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
        sentCount++;
      }
    });
    this.logger.log(`Reloaded ${sentCount} client(s)`);
  }

  close() {
    if (this.wss) this.wss.close();
    if (this.httpServer) this.httpServer.close();
  }
}

// File watcher setup
const setupWatcher = (directory, options, scheduleChange, logger) => {
  const outputRootDir = path.resolve(options.rootDir, options.outputPath || '_site');

  watch(
    directory,
    { recursive: true },
    async (event, filename) => {
      if (filename) {
        // Skip backup/temp files and hidden files
        if (filename.endsWith('~') || filename.startsWith('.') || filename.includes('/.')) {
          return;
        }

        const changedPath = path.resolve(directory, filename);
        if (changedPath === outputRootDir || changedPath.startsWith(outputRootDir + path.sep)) {
          return;
        }

        logger.log(`Detected ${event} in ${filename}`);

        const relativePath = String(filename).replace(/\\/g, '/');
        scheduleChange({
          scope: options.scope,
          relativePath,
          publicPath: options.scope === 'static' ? `/${relativePath}` : null,
          sourcePath: changedPath,
        });
      }
    },
  );
};

const setupConfigWatcher = (rootDir, options, scheduleChange) => {
  const logger = createLogger(options.quiet);

  watch(rootDir, { recursive: false }, async (event, filename) => {
    if (!filename) {
      return;
    }

    const normalized = String(filename).replace(/\\/g, '/');
    const baseName = path.basename(normalized);
    if (baseName !== 'sites.config.yaml' && baseName !== 'sites.config.yml') {
      return;
    }

    logger.log(`Detected ${event} in ${baseName}`);

    scheduleChange({
      scope: 'config',
      relativePath: baseName,
      publicPath: null,
    });
  });
};

const createRebuildScheduler = ({ rootDir, outputPath, server, logger }) => {
  let debounceTimer = null;
  let isBuilding = false;
  const pendingChanges = new Map();

  const flushChanges = async () => {
    if (isBuilding) return;
    isBuilding = true;
    try {
      while (pendingChanges.size > 0) {
        const changes = [...pendingChanges.values()];
        pendingChanges.clear();
        logger.log('Rebuilding site...');
        try {
          await buildSite({ rootDir, outputPath, quiet: true });
          logger.log('Rebuild complete');
          const finalizedChanges = finalizeWatchChanges(changes);
          server.reloadAll(classifyWatchChanges(finalizedChanges));
        } catch (error) {
          logger.error('Error during rebuild:', error);
        }
      }
    } finally {
      isBuilding = false;
    }
  };

  return (change) => {
    const key = `${change.scope}:${change.relativePath}`;
    pendingChanges.set(key, change);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      flushChanges();
    }, 10);
  };
};

// Main watch function
const watchSite = async (options = {}) => {
  const {
    port = 3001,
    rootDir = process.cwd(),
    outputPath = '_site',
    quiet = false,
    reloadMode = 'body'
  } = options;
  const normalizedPort = normalizePort(port);
  const normalizedReloadMode = String(reloadMode).toLowerCase();
  if (!RELOAD_MODES.has(normalizedReloadMode)) {
    throw new Error(`Invalid reload mode "${reloadMode}". Allowed values: body, full.`);
  }
  const logger = createLogger(quiet);

  // Load config file
  await loadSiteConfig(rootDir, true, true);

  // Do initial build with config
  logger.log('Starting initial build...');
  await buildSite({ rootDir, outputPath, quiet: true });
  logger.log('Initial build complete');

  // Start custom dev server
  const server = new DevServer(normalizedPort, path.resolve(rootDir, outputPath), logger, normalizedReloadMode);
  server.start();
  const scheduleChange = createRebuildScheduler({
    rootDir,
    outputPath,
    server,
    logger,
  });

  // Watch all relevant directories
  const dirsToWatch = ['data', 'templates', 'partials', 'pages', 'static'];

  dirsToWatch.forEach(dir => {
    const dirPath = path.join(rootDir, dir);
    if (existsSync(dirPath)) {
      logger.log(`Watching: ${dir}/`);
      setupWatcher(dirPath, {
        rootDir,
        outputPath,
        scope: dir,
      }, scheduleChange, logger);
    }
  });

  logger.log('Watching: sites.config.yaml');
  setupConfigWatcher(rootDir, { rootDir, outputPath, quiet }, scheduleChange);

  // Handle process termination
  process.on('SIGINT', async () => {
    logger.log('\nShutting down server...');
    server.close();
    process.exit();
  });

  process.on('SIGTERM', async () => {
    server.close();
    process.exit();
  });
};

export default watchSite;
