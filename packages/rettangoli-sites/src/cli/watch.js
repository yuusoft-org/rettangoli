import { watch, existsSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { buildSite } from './build.js';

const setupWatcher = (directory, options) => {
  watch(
    directory,
    { recursive: true },
    async (event, filename) => {
      console.log(`Detected ${event} in ${directory}/${filename}`);
      if (filename) {
        try {
          if (filename.endsWith('.yaml') || filename.endsWith('.yml') || filename.endsWith('.md')) {
            console.log('Rebuilding site...');
            await buildSite(options);
            console.log('Rebuild complete');
          }
        } catch (error) {
          console.error(`Error processing ${filename}:`, error);
          // Keep the watcher running
        }
      }
    },
  );
};

async function startViteServer(options) {
  const { port = 3001 } = options;
  const root = '_site';
  
  console.log('Starting dev server for:', root);
  
  try {
    const server = await createServer({
      root,
      server: {
        port,
        host: '0.0.0.0',
        allowedHosts: true
      },
    });
    await server.listen();

    server.printUrls();
    server.bindCLIShortcuts({ print: true });
  } catch (error) {
    console.error("Error during Vite server startup:", error);
    process.exit(1);
  }
}

const watchSite = async (options = {}) => {
  const { 
    port = 3001,
    rootDir = '.'
  } = options;

  // Do initial build
  console.log('Starting initial build...');
  await buildSite({ rootDir });
  console.log('Initial build complete');

  // Watch sitic directory for YAML files
  const siticDir = path.join(rootDir, 'sitic');
  if (existsSync(siticDir)) {
    setupWatcher(siticDir, { rootDir });
  }
  
  // Watch pages directory for Markdown files
  const pagesDir = path.join(rootDir, 'pages');
  if (existsSync(pagesDir)) {
    setupWatcher(pagesDir, { rootDir });
  }

  // Start Vite dev server
  startViteServer({ port });
};

export default watchSite;