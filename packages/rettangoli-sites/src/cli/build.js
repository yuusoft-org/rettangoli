import fs from 'fs';
import path from 'path';
import { createSiteBuilder } from '../createSiteBuilder.js';

/**
 * Build the static site
 * @param {Object} options - Options for building the site
 * @param {string} options.rootDir - Root directory of the site (defaults to cwd)
 * @param {Object} options.mdRender - Optional markdown renderer
 */
export const buildSite = async (options = {}) => {
  const { rootDir = process.cwd(), mdRender } = options;
  
  // Try to load config file if it exists
  let config = {};
  if (!mdRender) {
    try {
      const configPath = path.join(rootDir, 'sites.config.js');
      const configModule = await import(configPath);
      config = configModule.default || {};
    } catch (e) {
      // Config file is optional, continue without it
    }
  }

  const build = createSiteBuilder({ 
    fs, 
    rootDir,
    mdRender: mdRender || config.mdRender,
    functions: config.functions || {}
  });
  
  build();
};