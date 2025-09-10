import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { existsSync } from 'node:fs';
import { buildSite } from './cli/build.js';
import { createScreenshotCapture } from './screenshot.js';
import { loadSiteConfig } from './utils/loadSiteConfig.js';

function getContentType(ext) {
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

function serveFile(filePath, res, skipWebSocket = false) {
  const ext = path.extname(filePath);
  const contentType = getContentType(ext);
  
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    console.error('Error serving file:', err);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
}

function handleRequest(req, res, siteDir = '_site') {
  const urlParts = req.url.split('?');
  let urlPath = urlParts[0];
  const queryString = urlParts[1] || '';
  
  // Check if this is a screenshot request
  const isScreenshotRequest = queryString.includes('screenshot=true');
  
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
    const htmlPath = path.join(siteDir, urlPath + '.html');
    if (existsSync(htmlPath)) {
      urlPath = urlPath + '.html';
    } else {
      // Try as directory with index.html
      const indexPath = path.join(siteDir, urlPath, 'index.html');
      if (existsSync(indexPath)) {
        urlPath = path.join(urlPath, 'index.html');
      }
    }
  }
  
  const filePath = path.join(siteDir, urlPath);
  
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
      return serveFile(indexPath, res, isScreenshotRequest);
    } else {
      res.writeHead(404);
      res.end('404 Not Found');
      return;
    }
  }
  
  // Serve the file
  serveFile(filePath, res, isScreenshotRequest);
}

function createTempServer(port = 3001, siteDir = '_site') {
  const httpServer = http.createServer((req, res) => {
    handleRequest(req, res, siteDir);
  });

  const start = () => {
    return new Promise((resolve, reject) => {
      httpServer.listen(port, '0.0.0.0', () => {
        console.log(`📡 Temp server running at http://localhost:${port}/`);
        resolve();
      });

      httpServer.on('error', reject);
    });
  };

  const close = () => {
    return new Promise((resolve) => {
      httpServer.close(() => {
        console.log('📡 Temp server closed');
        resolve();
      });
    });
  };

  return { start, close };
}

const screenshotCommand = async (options = {}) => {
  const { 
    port = 3001,
    rootDir = '.'
  } = options;

  console.log('📸 Starting screenshot capture for all pages...');

  // Load config to get ignore patterns
  const config = await loadSiteConfig(rootDir, false);
  const ignorePatterns = config?.screenshots?.ignore || [];
  
  if (ignorePatterns.length > 0) {
    console.log('📋 Ignore patterns:', ignorePatterns);
  }

  // Build the site first
  console.log('Building site...');
  await buildSite({ rootDir });
  console.log('Build complete');

  // Start temporary server
  const server = createTempServer(port);
  await server.start();

  // Initialize screenshot capture
  const screenshotCapture = await createScreenshotCapture(port);

  try {
    // Capture screenshots for all pages
    const pagesDir = path.join(rootDir, 'pages');
    await screenshotCapture.captureAllPages(pagesDir, { ignorePatterns });
    
    console.log('✅ All screenshots captured successfully!');
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
  } finally {
    // Clean up
    await screenshotCapture.close();
    await server.close();
  }
};

export default screenshotCommand;