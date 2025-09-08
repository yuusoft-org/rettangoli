import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { createSiteBuilder } from '../createSiteBuilder.js';

/**
 * Build the static site
 * @param {Object} options - Options for building the site
 * @param {string} options.rootDir - Root directory of the site (defaults to cwd)
 * @param {Object} options.mdRender - Optional markdown renderer
 * @param {boolean} options.quiet - Suppress build output logs
 */
export const buildSite = async (options = {}) => {
  const { rootDir = process.cwd(), mdRender, functions, quiet = false } = options;

  // Try to load config file if it exists
  let config = {};
  if (!mdRender || !functions) {
    try {
      const configPath = path.join(rootDir, 'sites.config.js');
      const configModule = await import(pathToFileURL(configPath).href);
      config = configModule.default || {};
    } catch (e) {
      // Only ignore file not found errors
      if (e.code === 'ENOENT') {
        // Config file is optional, continue without it
      } else {
        // Re-throw any other errors (syntax errors, module not found, etc.)
        throw e;
      }
    }
  }

  const build = createSiteBuilder({
    fs,
    rootDir,
    mdRender: mdRender || config.mdRender,
    functions: functions || config.functions || {},
    quiet
  });

  build();
};
