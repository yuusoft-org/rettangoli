import fs from 'fs';
import { createSiteBuilder } from '../createSiteBuilder.js';
import { loadSiteConfig } from '../utils/loadSiteConfig.js';

/**
 * Build the static site
 * @param {Object} options - Options for building the site
 * @param {string} options.rootDir - Root directory of the site (defaults to cwd)
 * @param {string} options.outputPath - Output directory path (relative to rootDir by default)
 * @param {Object} options.md - Optional markdown renderer
 * @param {Object|boolean} options.sitemap - Optional sitemap generation config
 * @param {boolean} options.quiet - Suppress build output logs
 * @param {boolean} options.isScreenshotMode - Optional build flag exposed to templates via build.isScreenshotMode
 * @param {Function} options.loadComponentRenderer - Optional loader for the `@rettangoli/fe/server` module used by `components` (defaults to resolving it from rootDir)
 */
export const buildSite = async (options = {}) => {
  const {
    rootDir = process.cwd(),
    outputPath = '_site',
    md,
    functions,
    sitemap,
    quiet = false,
    isScreenshotMode = false,
    loadComponentRenderer
  } = options;

  const config = await loadSiteConfig(rootDir);

  const build = createSiteBuilder({
    fs,
    rootDir,
    outputPath,
    md,
    markdown: config.markdown || {},
    keepMarkdownFiles: config.build?.keepMarkdownFiles === true,
    imports: config.imports || {},
    data: config.data || {},
    sitemap: sitemap === undefined ? config.sitemap : sitemap,
    functions: functions || {},
    components: config.components,
    loadComponentRenderer,
    quiet,
    isScreenshotMode
  });

  await build();
};
