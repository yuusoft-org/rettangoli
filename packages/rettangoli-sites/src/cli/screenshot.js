import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

class ScreenshotCapture {
  constructor(port = 3001, outputDir = '_screenshots') {
    this.port = port;
    this.outputDir = outputDir;
    this.browser = null;
    this.context = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('🎬 Initializing Playwright browser...');
    this.browser = await chromium.launch({ 
      headless: true
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1366, height: 768 },  // Most common laptop viewport
      deviceScaleFactor: 0.75  // Reduce pixel density for smaller PNG files
    });
    this.isInitialized = true;
    console.log('✅ Browser initialized for screenshots');
  }

  async capturePageScreenshot(pagePath) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // Convert file path to URL path
      // pages/index.md -> /
      // pages/about.md -> /about
      // pages/store/index.md -> /store/
      // pages/store/products.md -> /store/products
      let urlPath = pagePath
        .replace(/^pages\//, '')
        .replace(/\.(md|yaml|yml)$/, '');
      
      if (urlPath === 'index') {
        urlPath = '/';
      } else if (urlPath.endsWith('/index')) {
        urlPath = urlPath.replace(/\/index$/, '/');
      } else if (urlPath) {
        // Add leading slash if not root
        urlPath = '/' + urlPath;
      }

      const url = `http://localhost:${this.port}${urlPath}?screenshot=true`;
      
      // Determine screenshot path
      // / -> index.png
      // /about -> about.png
      // /store/ -> store/index.png
      // /store/products -> store/products.png
      let screenshotPath;
      if (urlPath === '/') {
        screenshotPath = 'index.png';
      } else if (urlPath.endsWith('/')) {
        screenshotPath = urlPath.slice(1, -1) + '/index.png';
      } else {
        screenshotPath = urlPath.slice(1) + '.png';
      }
      
      const fullScreenshotPath = path.join(this.outputDir, screenshotPath);
      
      // Ensure directory exists
      const screenshotDir = path.dirname(fullScreenshotPath);
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      console.log(`📸 Capturing screenshot: ${url} -> ${fullScreenshotPath}`);
      
      const page = await this.context.newPage();
      
      try {
        // Navigate to the page
        await page.goto(url, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        // // Wait a bit for content to load
        // await page.waitForTimeout(2000);
        
        // Take screenshot with PNG optimization
        await page.screenshot({ 
          path: fullScreenshotPath,
          fullPage: true,
          type: 'png'
        });
        
        console.log(`✅ Screenshot saved: ${fullScreenshotPath}`);
      } catch (error) {
        console.error(`❌ Failed to capture ${url}:`, error.message);
      } finally {
        await page.close();
      }
    } catch (error) {
      console.error('❌ Screenshot error:', error);
    }
  }

  async captureAllPages(pagesDir) {
    if (!fs.existsSync(pagesDir)) {
      console.log('Pages directory does not exist:', pagesDir);
      return;
    }

    const captureRecursive = async (dir, basePath = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        if (entry.isDirectory()) {
          // Recurse into subdirectories
          await captureRecursive(fullPath, relativePath);
        } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
          // Capture screenshot for this page
          const pagePath = path.join('pages', relativePath);
          await this.capturePageScreenshot(pagePath);
        }
      }
    };

    await captureRecursive(pagesDir);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.isInitialized = false;
      console.log('🔚 Browser closed');
    }
  }
}

export default ScreenshotCapture;
