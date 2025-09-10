import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';

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
    // Don't create a context here - we'll create multiple contexts for parallel processing
    this.isInitialized = true;
    console.log('✅ Browser initialized for screenshots');
  }

  async capturePageScreenshot(pagePath, context = null) {
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
      // / -> index.webp
      // /about -> about.webp
      // /store/ -> store/index.webp
      // /store/products -> store/products.webp
      let screenshotPath;
      if (urlPath === '/') {
        screenshotPath = 'index.webp';
      } else if (urlPath.endsWith('/')) {
        screenshotPath = urlPath.slice(1, -1) + '/index.webp';
      } else {
        screenshotPath = urlPath.slice(1) + '.webp';
      }
      
      const fullScreenshotPath = path.join(this.outputDir, screenshotPath);
      const tempPngPath = fullScreenshotPath.replace('.webp', '.png');
      
      // Ensure directory exists
      const screenshotDir = path.dirname(fullScreenshotPath);
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      console.log(`📸 Capturing screenshot: ${url} -> ${fullScreenshotPath}`);
      
      // Create a context if not provided
      const shouldCloseContext = !context;
      if (!context) {
        context = await this.browser.newContext({
          viewport: { width: 1366, height: 768 },  // Most common laptop viewport
          deviceScaleFactor: 0.75  // Reduce pixel density for smaller PNG files
        });
      }
      
      const page = await context.newPage();
      
      try {
        // Navigate to the page
        await page.goto(url, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        // // Wait a bit for content to load
        // await page.waitForTimeout(2000);
        
        // Take screenshot as PNG first (Playwright doesn't support WebP)
        await page.screenshot({ 
          path: tempPngPath,
          fullPage: true,
          type: 'png'
        });
        
        // Convert PNG to WebP using Sharp
        await sharp(tempPngPath)
          .webp({ quality: 85 })
          .toFile(fullScreenshotPath);
        
        // Remove temporary PNG file
        if (fs.existsSync(tempPngPath)) {
          fs.unlinkSync(tempPngPath);
        }
        
        console.log(`✅ Screenshot saved: ${fullScreenshotPath}`);
      } catch (error) {
        console.error(`❌ Failed to capture ${url}:`, error.message);
        // Clean up temp PNG file if it exists
        if (fs.existsSync(tempPngPath)) {
          fs.unlinkSync(tempPngPath);
        }
      } finally {
        await page.close();
        // Close context if we created it
        if (shouldCloseContext) {
          await context.close();
        }
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

    // First, collect all page paths
    const pagePaths = [];
    
    const collectPaths = (dir, basePath = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        if (entry.isDirectory()) {
          // Recurse into subdirectories
          collectPaths(fullPath, relativePath);
        } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
          // Add page path to the list
          const pagePath = path.join('pages', relativePath);
          pagePaths.push(pagePath);
        }
      }
    };

    collectPaths(pagesDir);
    
    console.log(`📸 Found ${pagePaths.length} pages to capture`);
    
    // Process pages in parallel with concurrency limit of 12
    const concurrency = 12;
    const results = [];
    
    // Create contexts for parallel processing
    const contexts = await Promise.all(
      Array(Math.min(concurrency, pagePaths.length))
        .fill(null)
        .map(() => this.browser.newContext({
          viewport: { width: 1366, height: 768 },  // Most common laptop viewport
          deviceScaleFactor: 0.75  // Reduce pixel density for smaller PNG files
        }))
    );
    
    try {
      for (let i = 0; i < pagePaths.length; i += concurrency) {
        const batch = pagePaths.slice(i, i + concurrency);
        console.log(`📸 Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(pagePaths.length / concurrency)} (${batch.length} pages)`);
        
        const batchPromises = batch.map((pagePath, index) => 
          this.capturePageScreenshot(pagePath, contexts[index]).catch(error => {
            console.error(`Failed to capture ${pagePath}:`, error);
            return null;
          })
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
    } finally {
      // Clean up contexts
      await Promise.all(contexts.map(ctx => ctx.close()));
    }
    
    console.log(`✅ Completed capturing ${pagePaths.length} screenshots`);
    return results;
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
