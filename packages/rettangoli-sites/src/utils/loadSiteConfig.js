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
  const configPath = path.join(rootDir, 'sites.config.js');
  const configFileUrl = pathToFileURL(configPath).href;

  try {
    let importUrl = configFileUrl;
    
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
    // Only ignore when the root sites.config.js file itself is missing
    const missingConfigByPath = e.code === 'ENOENT' && (e.path === configPath || e.message?.includes(configPath));
    const missingConfigByImport = e.code === 'ERR_MODULE_NOT_FOUND' && e.message?.includes(configFileUrl);

    if (missingConfigByPath || missingConfigByImport) {
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
