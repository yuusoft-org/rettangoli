import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { existsSync } from 'node:fs';
import { buildSite } from './build.js';
import ScreenshotCapture from './screenshot.js';

class TempDevServer {
  constructor(port = 3001) {
    this.port = port;
    this.siteDir = '_site';
  }

  start() {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.httpServer.listen(this.port, '0.0.0.0', () => {
        console.log(`📡 Temp server running at http://localhost:${this.port}/`);
        resolve();
      });

      this.httpServer.on('error', reject);
    });
  }

  handleRequest(req, res) {
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
        return this.serveFile(indexPath, res, isScreenshotRequest);
      } else {
        res.writeHead(404);
        res.end('404 Not Found');
        return;
      }
    }
    
    // Serve the file
    this.serveFile(filePath, res, isScreenshotRequest);
  }
  
  serveFile(filePath, res, skipWebSocket = false) {
    const ext = path.extname(filePath);
    const contentType = this.getContentType(ext);
    
    try {
      let content = fs.readFileSync(filePath);
      
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

  close() {
    return new Promise((resolve) => {
      this.httpServer.close(() => {
        console.log('📡 Temp server closed');
        resolve();
      });
    });
  }
}

const screenshotCommand = async (options = {}) => {
  const { 
    port = 3001,
    rootDir = '.'
  } = options;

  console.log('📸 Starting screenshot capture for all pages...');

  // Build the site first
  console.log('Building site...');
  await buildSite({ rootDir });
  console.log('Build complete');

  // Start temporary server
  const server = new TempDevServer(port);
  await server.start();

  // Initialize screenshot capture
  const screenshotCapture = new ScreenshotCapture(port);
  await screenshotCapture.init();

  try {
    // Capture screenshots for all pages
    const pagesDir = path.join(rootDir, 'pages');
    await screenshotCapture.captureAllPages(pagesDir);
    
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