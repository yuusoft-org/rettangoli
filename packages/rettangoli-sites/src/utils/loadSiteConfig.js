import path from 'path';
import { pathToFileURL } from 'url';
import MarkdownIt from 'markdown-it';

/**
 * Load the sites.config.js file from a given directory
 * @param {string} rootDir - The root directory to look for sites.config.js
 * @param {boolean} throwOnError - Whether to throw on errors other than file not found
 * @param {boolean} bustCache - Whether to bypass module cache (for reloading)
 * @returns {Promise<Object>} The loaded config object or empty object if not found
 */
export async function loadSiteConfig(rootDir, throwOnError = true, bustCache = false) {
  try {
    const configPath = path.join(rootDir, 'sites.config.js');
    let importUrl = pathToFileURL(configPath).href;
    
    // Add timestamp to force reload if cache busting is requested
    if (bustCache) {
      importUrl += `?t=${Date.now()}`;
    }
    
    const configModule = await import(importUrl);
    const configExport = configModule.default;
    
    // Check if the export is a function
    if (typeof configExport === 'function') {
      // Call the function with markdownit constructor
      return configExport({ markdownit: MarkdownIt }) || {};
    }
    
    // Otherwise return as is (for backward compatibility)
    return configExport || {};
  } catch (e) {
    // Only ignore file not found errors
    if (e.code === 'ENOENT') {
      // Config file is optional, return empty config
      return {};
    } else if (throwOnError) {
      // Re-throw any other errors (syntax errors, module not found, etc.)
      throw e;
    } else {
      console.error('Error loading sites.config.js:', e);
      return {};
    }
  }
}