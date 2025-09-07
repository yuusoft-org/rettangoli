import fs, { watch, existsSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { buildSite } from './build.js';

const setupWatcher = (directory, options, server) => {
  let debounceTimer = null;
  let pendingFiles = new Set();
  
  const processChanges = async () => {
    const files = [...pendingFiles];
    pendingFiles.clear();
    
    console.log('Rebuilding site...');
    try {
      await buildSite({ ...options, quiet: true });
      console.log('Rebuild complete');
      
      // Trigger Vite HMR reload
      if (server) {
        server.ws.send({
          type: 'full-reload'
        });
      }
    } catch (error) {
      console.error('Error during rebuild:', error);
    }
  };
  
  watch(
    directory,
    { recursive: true },
    async (event, filename) => {
      console.log(`Detected ${event} in ${directory}/${filename}`);
      if (filename) {
        if (filename.endsWith('.yaml') || filename.endsWith('.yml') || filename.endsWith('.md')) {
          pendingFiles.add(filename);
          
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
          
          debounceTimer = setTimeout(processChanges, 10);
        }
      }
    },
  );
};

async function startViteServer(options) {
  const { port = 3001 } = options;
  const siteDir = path.resolve(process.cwd(), '_site');
  
  console.log(`Starting Vite dev server for ${siteDir} on port ${port}...`);
  
  try {
    // Create a minimal vite config that serves _site as static files
    const server = await createServer({
      configFile: false,  // Don't look for vite.config.js
      root: siteDir,      // Serve from _site directory
      base: '/',
      server: {
        port,
        host: '0.0.0.0',
        fs: {
          strict: false
        }
      },
      // Disable Vite's optimizer for static HTML files
      optimizeDeps: {
        entries: []  // Don't scan for dependencies
      },
      appType: 'mpa',  // Multi-page app - don't assume SPA behavior
      // Create a simple plugin to handle routing
      plugins: [{
        name: 'static-html-router',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Get clean URL without query params
            const url = req.url?.split('?')[0];
            
            // Skip Vite internal routes
            if (!url || url.startsWith('/@')) {
              return next();
            }
            
            // For paths without extension, check if index.html exists
            if (!path.extname(url)) {
              // Try exact .html file first
              const htmlPath = path.join(siteDir, url + '.html');
              if (fs.existsSync(htmlPath)) {
                req.url = url + '.html';
                return next();
              }
              
              // Try directory with index.html
              const indexPath = path.join(siteDir, url, 'index.html');
              if (fs.existsSync(indexPath)) {
                req.url = url + '/index.html';
                return next();
              }
            }
            
            next();
          });
        }
      }]
    });
    
    await server.listen();
    server.printUrls();
    
    return server;
  } catch (error) {
    console.error("Error during Vite server startup:", error);
    process.exit(1);
  }
}

const watchSite = async (options = {}) => {
  const { 
    port = 3001,
    rootDir = '.'
  } = options;

  // Do initial build
  console.log('Starting initial build...');
  await buildSite({ rootDir });
  console.log('Initial build complete');

  // Start Vite dev server
  const server = await startViteServer({ port });

  // Watch sitic directory for YAML files
  const siticDir = path.join(rootDir, 'sitic');
  if (existsSync(siticDir)) {
    setupWatcher(siticDir, { rootDir }, server);
  }
  
  // Watch pages directory for Markdown files
  const pagesDir = path.join(rootDir, 'pages');
  if (existsSync(pagesDir)) {
    setupWatcher(pagesDir, { rootDir }, server);
  }

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close();
    process.exit();
  });
  
  process.on('SIGTERM', () => {
    server.close();
    process.exit();
  });
};

export default watchSite;