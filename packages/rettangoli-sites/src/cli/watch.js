import fs, { watch, existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { buildSite } from './build.js';
import { loadSiteConfig } from '../utils/loadSiteConfig.js';

const RELOAD_MODES = new Set(['body', 'full']);

export function createClientScript(reloadMode = 'body') {
  const shouldUseBodyReplacement = reloadMode === 'body';
  const reloadSnippet = shouldUseBodyReplacement
    ? `
      // Fetch the current page's HTML
      fetch(window.location.href)
        .then(response => response.text())
        .then(html => {
          // Parse the new HTML
          const parser = new DOMParser();
          const newDoc = parser.parseFromString(html, 'text/html');

          // Replace entire body content
          document.body.innerHTML = newDoc.body.innerHTML;
        })
        .catch(err => {
          console.error('Hot reload failed:', err);
          // Fallback to full reload
          window.location.reload();
        });
    `
    : `
      window.location.reload();
    `;

  return `
<script>
(function() {
  const wsProtocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
  const ws = new WebSocket(wsProtocol + location.host);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'reload-current') {
      ${reloadSnippet}
    }
  };

  ws.onclose = () => {
    setTimeout(() => location.reload(), 1000);
  };
})();
</script>
`;
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
  constructor(port = 3001, siteDir = '_site', logger = createLogger(false), reloadMode = 'body') {
    this.port = port;
    this.clients = new Set();
    this.siteDir = siteDir;
    this.logger = logger;
    this.clientScript = createClientScript(reloadMode);
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
    const contentType = this.getContentType(ext);

    try {
      let content = fs.readFileSync(filePath);

      // Inject client script into HTML files
      if (ext === '.html') {
        content = content.toString();
        // Inject before </body> or </html> or at the end
        if (content.includes('</body>')) {
          content = content.replace('</body>', this.clientScript + '</body>');
        } else if (content.includes('</html>')) {
          content = content.replace('</html>', this.clientScript + '</html>');
        } else {
          content = content + this.clientScript;
        }
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (err) {
      this.logger.error('Error serving file:', err);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }

  getContentType(ext) {
    const types = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    return types[ext] || 'application/octet-stream';
  }

  reloadAll() {
    // Send a simple reload command to all clients
    const message = JSON.stringify({
      type: 'reload-current'
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
const setupWatcher = (directory, options, server, logger) => {
  let debounceTimer = null;
  const outputRootDir = path.resolve(options.rootDir, options.outputPath || '_site');

  const processChanges = async () => {
    logger.log('Rebuilding site...');
    try {
      await buildSite({
        rootDir: options.rootDir,
        outputPath: options.outputPath,
        quiet: true
      });
      logger.log('Rebuild complete');

      // Just reload all clients - they'll reload their current page
      server.reloadAll();

    } catch (error) {
      logger.error('Error during rebuild:', error);
    }
  };

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

        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(processChanges, 10);
      }
    },
  );
};

const setupConfigWatcher = (rootDir, options, server) => {
  let debounceTimer = null;
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

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      logger.log('Rebuilding site...');
      try {
        await buildSite({
          rootDir: options.rootDir,
          outputPath: options.outputPath,
          quiet: true
        });
        logger.log('Rebuild complete');
        server.reloadAll();
      } catch (error) {
        logger.error('Error during rebuild:', error);
      }
    }, 10);
  });
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
  const server = new DevServer(port, path.resolve(rootDir, outputPath), logger, normalizedReloadMode);
  server.start();

  // Watch all relevant directories
  const dirsToWatch = ['data', 'templates', 'partials', 'pages', 'static'];

  dirsToWatch.forEach(dir => {
    const dirPath = path.join(rootDir, dir);
    if (existsSync(dirPath)) {
      logger.log(`Watching: ${dir}/`);
      setupWatcher(dirPath, {
        rootDir,
        outputPath
      }, server, logger);
    }
  });

  logger.log('Watching: sites.config.yaml');
  setupConfigWatcher(rootDir, { rootDir, outputPath, quiet }, server);

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
