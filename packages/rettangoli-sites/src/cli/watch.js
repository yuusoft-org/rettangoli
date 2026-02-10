import fs, { watch, existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { buildSite } from './build.js';
import { loadSiteConfig } from '../utils/loadSiteConfig.js';

// Client script to inject into HTML pages
const CLIENT_SCRIPT = `
<script>
(function() {
  console.log('🔌 Connecting to WebSocket...');
  const ws = new WebSocket('ws://' + location.host);
  
  ws.onopen = () => {
    console.log('✅ WebSocket connected');
  };
  
  ws.onmessage = (event) => {
    console.log('📨 Message received:', event.data);
    const data = JSON.parse(event.data);
    
    if (data.type === 'reload-current') {
      console.log('🔄 Fetching updated page...');
      
      // Fetch the current page's HTML
      fetch(window.location.href)
        .then(response => response.text())
        .then(html => {
          console.log('📄 Received updated HTML');
          
          // Parse the new HTML
          const parser = new DOMParser();
          const newDoc = parser.parseFromString(html, 'text/html');
          
          // Replace entire body content
          document.body.innerHTML = newDoc.body.innerHTML;
          
          console.log('✅ Hot reload complete');
        })
        .catch(err => {
          console.error('❌ Failed to fetch updated page:', err);
          // Fallback to full reload
          window.location.reload();
        });
    }
  };
  
  ws.onclose = () => {
    console.log('❌ Lost connection to dev server. Reloading in 1s...');
    setTimeout(() => location.reload(), 1000);
  };
  
  ws.onerror = (err) => {
    console.error('❌ WebSocket error:', err);
  };
})();
</script>
`;

class DevServer {
  constructor(port = 3001) {
    this.port = port;
    this.clients = new Set();
    this.siteDir = '_site';
  }

  start() {
    // Create HTTP server
    this.httpServer = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: this.httpServer });
    console.log('WebSocket server created');

    this.wss.on('connection', (ws) => {
      console.log('✅ Client connected. Total clients:', this.clients.size + 1);
      this.clients.add(ws);

      ws.on('close', () => {
        console.log('❌ Client disconnected. Remaining clients:', this.clients.size - 1);
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('❌ WebSocket error:', err);
        this.clients.delete(ws);
      });
    });

    // Start listening
    this.httpServer.listen(this.port, '0.0.0.0', () => {
      console.log(`\n  Dev server running at:\n`);
      console.log(`  > Local:    http://localhost:${this.port}/`);
      console.log(`  > Network:  http://0.0.0.0:${this.port}/\n`);
      console.log(`  Hot reload enabled (body replacement)\n`);
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
          content = content.replace('</body>', CLIENT_SCRIPT + '</body>');
        } else if (content.includes('</html>')) {
          content = content.replace('</html>', CLIENT_SCRIPT + '</html>');
        } else {
          content = content + CLIENT_SCRIPT;
        }
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (err) {
      console.error('Error serving file:', err);
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
    console.log('📤 Sending reload message to', this.clients.size, 'clients');

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

    console.log('✅ Reload message sent to', sentCount, 'clients');
  }

  close() {
    if (this.wss) this.wss.close();
    if (this.httpServer) this.httpServer.close();
  }
}

// File watcher setup
const setupWatcher = (directory, options, server) => {
  let debounceTimer = null;

  const processChanges = async () => {
    console.log('Rebuilding site...');
    try {
      await buildSite({ rootDir: options.rootDir, quiet: true });
      console.log('Rebuild complete');

      // Just reload all clients - they'll reload their current page
      console.log('🔄 Reloading all connected clients');
      server.reloadAll();

    } catch (error) {
      console.error('Error during rebuild:', error);
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

        // Skip _site directory if it somehow gets included
        if (filename.includes('_site/')) {
          return;
        }

        console.log(`Detected ${event} in ${filename}`);

        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(processChanges, 10);
      }
    },
  );
};

// Main watch function
const watchSite = async (options = {}) => {
  const {
    port = 3001,
    rootDir = process.cwd()
  } = options;

  // Load config file
  console.log(`📁 Current working directory: ${process.cwd()}`);
  console.log(`📁 rootDir parameter: ${rootDir}`);
  const config = await loadSiteConfig(rootDir, true, true);
  const hasYamlConfig = existsSync(path.join(rootDir, 'sites.config.yaml')) || existsSync(path.join(rootDir, 'sites.config.yml'));
  
  if (hasYamlConfig) {
    console.log('✅ Loaded site config from sites.config.yaml');
    if (config.markdown) {
      console.log('✅ Markdown options configured');
    } else {
      console.log('ℹ️  No markdown options in config');
    }
  } else {
    console.log('ℹ️  No sites.config.yaml found, using defaults');
  }

  // Do initial build with config
  console.log('Starting initial build...');
  await buildSite({ rootDir });
  console.log('Initial build complete');

  // Start custom dev server
  const server = new DevServer(port);
  server.start();

  // Watch all relevant directories
  const dirsToWatch = ['data', 'templates', 'partials', 'pages', 'static'];

  dirsToWatch.forEach(dir => {
    const dirPath = path.join(rootDir, dir);
    if (existsSync(dirPath)) {
      console.log(`👁️  Watching: ${dir}/`);
      setupWatcher(dirPath, {
        rootDir
      }, server);
    }
  });

  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    server.close();
    process.exit();
  });

  process.on('SIGTERM', async () => {
    server.close();
    process.exit();
  });
};

export default watchSite;
