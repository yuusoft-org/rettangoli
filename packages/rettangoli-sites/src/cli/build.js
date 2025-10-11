import fs from 'fs';
import { createSiteBuilder } from '../createSiteBuilder.js';
import { loadSiteConfig } from '../utils/loadSiteConfig.js';

/**
 * Build the static site
 * @param {Object} options - Options for building the site
 * @param {string} options.rootDir - Root directory of the site (defaults to cwd)
 * @param {Object} options.md - Optional markdown renderer
 * @param {boolean} options.quiet - Suppress build output logs
 */
export const buildSite = async (options = {}) => {
  const { rootDir = process.cwd(), md, functions, quiet = false } = options;

  // Load config file if needed
  let config = {};
  if (!md || !functions) {
    config = await loadSiteConfig(rootDir);
  }

  const build = createSiteBuilder({
    fs,
    rootDir,
    md: md || config.mdRender,
    functions: functions || config.functions || {},
    quiet
  });

  await build();
};
