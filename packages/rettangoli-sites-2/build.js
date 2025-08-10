import fs from 'fs';
import { createSiteBuilder } from './src/createSiteBuilder.js';

// Try to load config file if it exists
let config = {};
try {
  const configModule = await import('./sites.config.js');
  config = configModule.default || {};
} catch (e) {
  // Config file is optional, continue without it
}

const build = createSiteBuilder({ fs, mdRender: config.mdRender });
await build();